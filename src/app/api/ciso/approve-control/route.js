// import { MongoClient } from "mongodb";
// import { withCORS } from "../../../middleware/cors";

// async function approveControlHandler(req) {
//   if (req.method !== "POST") {
//     return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });
//   }

//   try {
//     const body = await req.json();
//     const { controlLinks, action, comment } = body;

//     if (!controlLinks || !Array.isArray(controlLinks) || controlLinks.length === 0) {
//       return new Response(JSON.stringify({ message: "Missing control links" }), { status: 400 });
//     }

//     if (!["approved", "rejected", "risk"].includes(action)) {
//       return new Response(JSON.stringify({ message: "Invalid action" }), { status: 400 });
//     }

//     const client = await MongoClient.connect(process.env.MONGO_URI);
//     const db = client.db("APEX");
//     const collection = db.collection("owner_evidence");

//     // Only update file status/comments if not 'risk'
//     if (action !== "risk") {
//       for (const link of controlLinks) {
//         await collection.updateOne(
//           { "evidences.files.url": link },
//           {
//             $set: {
//               "evidences.$[].files.$[file].status": action,
//               ...(action === "rejected"
//                 ? { "evidences.$[].files.$[file].comment": comment }
//                 : {}),
//             },
//           },
//           { arrayFilters: [{ "file.url": link }] }
//         );
//       }
//     }

//     // Find all documents affected
//     const affectedDocs = await collection.find({
//       "evidences.files.url": { $in: controlLinks },
//     }).toArray();

//     for (const doc of affectedDocs) {
//       let newStatus = "pending-approval";

//       if (action === "risk") {
//         newStatus = "risk";
//       } else {
//         let allApproved = true;
//         let anyRejected = false;

//         for (const evidence of doc.evidences) {
//           for (const file of evidence.files) {
//             if (file.status === "rejected") anyRejected = true;
//             if (file.status !== "approved") allApproved = false;
//           }
//         }

//         if (allApproved) {
//           newStatus = "approved";
//         } else if (anyRejected) {
//           newStatus = "partially-approved";
//         }
//       }

//       await collection.updateOne(
//         { _id: doc._id },
//         {
//           $set: {
//             status: newStatus,
//             ...(action === "risk" ? { comment } : {}),
//           },
//         }
//       );
//     }

//     await client.close();

//     return new Response(JSON.stringify({ message: `Updated as ${action}` }), {
//       status: 200,
//     });
//   } catch (err) {
//     console.error("❌ Error updating control statuses:", err.message);
//     return new Response(JSON.stringify({ message: "Server error" }), { status: 500 });
//   }
// }

// export const POST = withCORS(approveControlHandler);



import { MongoClient } from "mongodb";
import { withCORS } from "../../../middleware/cors";

async function approveControlHandler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });
  }

  try {
    const body = await req.json();
    const { controlLinks, action, comment } = body;

    if (!controlLinks || !Array.isArray(controlLinks) || controlLinks.length === 0) {
      return new Response(JSON.stringify({ message: "Missing control links" }), { status: 400 });
    }

    if (!["approved", "rejected", "risk"].includes(action)) {
      return new Response(JSON.stringify({ message: "Invalid action" }), { status: 400 });
    }

    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db("APEX");
    const collection = db.collection("owner_evidence");
    const auditCollection = db.collection("audit_trial");

    // ✅ Update in owner_evidence
    if (action !== "risk") {
      for (const link of controlLinks) {
        await collection.updateOne(
          { "evidences.files.url": link },
          {
            $set: {
              "evidences.$[].files.$[file].status": action,
              ...(action === "rejected"
                ? { "evidences.$[].files.$[file].comment": comment }
                : {}),
            },
          },
          { arrayFilters: [{ "file.url": link }] }
        );
      }
    }

    // ✅ Update in audit_trial → docUploads
    for (const link of controlLinks) {
      const auditDoc = await auditCollection.findOne({
        "evidences.docUploads.url": link,
      });

      if (auditDoc) {
        for (let i = 0; i < auditDoc.evidences.length; i++) {
          const uploads = auditDoc.evidences[i].docUploads || [];

          for (let j = 0; j < uploads.length; j++) {
            const u = uploads[j];

            // check url + reuploadUrls for match
            const urlsToCheck = [
              u.url,
              ...Object.keys(u).filter((k) => k.startsWith("reuploadUrl")).map((k) => u[k])
            ];

            if (urlsToCheck.includes(link)) {
              // Find latest index for comment/rejected/approved
              let next = 1;
              while (u[`status${next}`] || (next === 1 && u.status)) {
                next++;
              }

              const updateFields = {};

              if (action === "approved") {
                updateFields[
                  `evidences.${i}.docUploads.${j}.status${next === 1 ? "" : next}`
                ] = "approved";
                updateFields[
                  `evidences.${i}.docUploads.${j}.approvedAt${next === 1 ? "" : next}`
                ] = new Date();
              }
              if (action === "rejected") {
                updateFields[
                  `evidences.${i}.docUploads.${j}.status${next === 1 ? "" : next}`
                ] = "rejected";
                updateFields[
                  `evidences.${i}.docUploads.${j}.rejectedAt${next === 1 ? "" : next}`
                ] = new Date();
                updateFields[
                  `evidences.${i}.docUploads.${j}.comment${next === 1 ? "" : next}`
                ] = comment;
              }

              if (action === "risk") {
                // Instead of adding inside docUploads, mark risk at the main evidence level
                await auditCollection.updateOne(
                  { "controlId": auditDoc.controlId, "evidences.evidenceName": auditDoc.evidences[i].evidenceName },
                  {
                    $set: {
                      "evidences.$.riskStatus": "risk",
                      "evidences.$.riskAt": new Date(),
                      "evidences.$.riskComment": comment,
                    }
                  }
                );
              }


              await auditCollection.updateOne(
                { _id: auditDoc._id },
                { $set: updateFields }
              );
            }
          }
        }
      }
    }

    // ✅ Update overall owner_evidence status
    const affectedDocs = await collection.find({
      "evidences.files.url": { $in: controlLinks },
    }).toArray();

    for (const doc of affectedDocs) {
      let newStatus = "pending-approval";

      if (action === "risk") {
        newStatus = "risk";
      } else {
        let allApproved = true;
        let anyRejected = false;

        for (const evidence of doc.evidences) {
          for (const file of evidence.files) {
            if (file.status === "rejected") anyRejected = true;
            if (file.status !== "approved") allApproved = false;
          }
        }

        if (allApproved) {
          newStatus = "approved";
        } else if (anyRejected) {
          newStatus = "partially-approved";
        }
      }

      await collection.updateOne(
        { _id: doc._id },
        {
          $set: {
            status: newStatus,
            ...(action === "risk" ? { comment } : {}),
          },
        }
      );
    }

    await client.close();

    return new Response(JSON.stringify({ message: `Updated as ${action}` }), {
      status: 200,
    });
  } catch (err) {
    console.error("❌ Error updating control statuses:", err.message);
    return new Response(JSON.stringify({ message: "Server error" }), { status: 500 });
  }
}

export const POST = withCORS(approveControlHandler);
