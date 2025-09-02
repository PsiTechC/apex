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

//     if (!["approved", "rejected"].includes(action)) {
//       return new Response(JSON.stringify({ message: "Invalid action" }), { status: 400 });
//     }

//     const client = await MongoClient.connect(process.env.MONGO_URI);
//     const db = client.db("APEX");
//     const collection = db.collection("owner_evidence");

//     for (const link of controlLinks) {
//       await collection.updateOne(
//         { "evidences.files.url": link },
//         {
//           $set: {
//             "evidences.$[].files.$[file].status": action,
//             ...(action === "rejected" ? { "evidences.$[].files.$[file].comment": comment } : {}),
//           },
//         },
//         { arrayFilters: [{ "file.url": link }] }
//       );
//     }

//     const affectedDocs = await collection.find({
//       "evidences.files.url": { $in: controlLinks },
//     }).toArray();

//     for (const doc of affectedDocs) {
//       let allApproved = true;
//       let anyRejected = false;

//       for (const evidence of doc.evidences) {
//         for (const file of evidence.files) {
//           if (file.status === "rejected") {
//             anyRejected = true;
//           }
//           if (file.status !== "approved") {
//             allApproved = false;
//           }
//         }
//       }

//       const newStatus = allApproved
//         ? "approved"
//         : anyRejected
//         ? "partially-approved"
//         : "pending-approval";

//       await collection.updateOne({ _id: doc._id }, { $set: { status: newStatus } });
//     }

//     await client.close();

//     return new Response(JSON.stringify({ message: `Links updated as ${action}` }), { status: 200 });
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

    // Only update file status/comments if not 'risk'
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

    // Find all documents affected
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
