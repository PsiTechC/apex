// import { MongoClient } from "mongodb";
// import { withCORS } from "../../../middleware/cors";

// async function assignControl(req) {
//   try {
//     if (req.method !== "POST") {
//       return new Response(JSON.stringify({ message: "Method not allowed" }), {
//         status: 405,
//       });
//     }

//     const body = await req.json();
//     const {
//       controlId,
//       goal,
//       function: func,
//       description,
//       guidance,
//       evidences = [],
//       ciso_email,
//     } = body;

//     const groupedByOwner = {};
//     evidences.forEach((evi) => {
//       if (!evi.owner) return;
//       if (!groupedByOwner[evi.owner]) groupedByOwner[evi.owner] = [];
//       groupedByOwner[evi.owner].push({
//         name: evi.name,
//         frequency: evi.frequency,
//       });
//     });

//     const client = await MongoClient.connect(process.env.MONGO_URI);
//     const db = client.db("APEX");
//     const collection = db.collection("owner_evidence");
//     const auditCollection = db.collection("audit_trial");

//     const inserts = [];

//     for (const [ownerEmail, ownerEvidences] of Object.entries(groupedByOwner)) {
//       for (const evidence of ownerEvidences) {
//         // --- Normal owner_evidence flow ---
//         const existingDoc = await collection.findOne({
//           controlId,
//           "evidences.name": evidence.name,
//         });

//         if (existingDoc) {
//           const oldOwner = existingDoc.owner;
//           if (
//             oldOwner !== ownerEmail ||
//             existingDoc.evidences[0].frequency !== evidence.frequency
//           ) {
//             await collection.updateOne(
//               { _id: existingDoc._id },
//               {
//                 $set: {
//                   owner: ownerEmail,
//                   "evidences.0.frequency": evidence.frequency,
//                   timestamp: new Date(),
//                 },
//               }
//             );
//           }
//         } else {
//           inserts.push({
//             owner: ownerEmail,
//             controlId,
//             goal,
//             function: func,
//             description,
//             guidance,
//             evidences: [evidence],
//             status: "pending",
//             timestamp: new Date(),
//           });
//         }

//         // --- Audit trail flow ---
//         const existingAudit = await auditCollection.findOne({
//           ciso: ciso_email,
//           controlId,
//         });

//         if (!existingAudit) {
//           // First time → create doc with evidences array
//           await auditCollection.insertOne({
//             ciso: ciso_email,
//             controlId,
//             evidences: [
//               {
//                 evidenceName: evidence.name,
//                 frequency: evidence.frequency,
//                 owner: ownerEmail,
//                 assignedDate: new Date(),
//               },
//             ],
//             createdAt: new Date(),
//           });
//         } else {
//           // Doc already exists → check if evidence already present
//           const evidenceIndex = existingAudit.evidences.findIndex(
//             (e) => e.evidenceName === evidence.name
//           );

//           if (evidenceIndex === -1) {
//             // New evidence → push into evidences array
//             await auditCollection.updateOne(
//               { _id: existingAudit._id },
//               {
//                 $push: {
//                   evidences: {
//                     evidenceName: evidence.name,
//                     frequency: evidence.frequency,
//                     owner: ownerEmail,
//                     assignedDate: new Date(),
//                   },
//                 },
//               }
//             );
//           } else {
//             // Evidence exists → add reassignment trail
//             const currentEvidence = existingAudit.evidences[evidenceIndex];
//             let index = 1;
//             let updateFields = {};

//             while (currentEvidence[`reassignOwner${index}`]) {
//               index++;
//             }

//             updateFields[`evidences.${evidenceIndex}.reassignOwner${index}`] =
//               ownerEmail;
//             updateFields[`evidences.${evidenceIndex}.reassignOwnerDate${index}`] =
//               new Date();

//             await auditCollection.updateOne(
//               { _id: existingAudit._id },
//               { $set: updateFields }
//             );
//           }
//         }
//       }
//     }

//     if (inserts.length > 0) {
//       await collection.insertMany(inserts);
//     }

//     await client.close();

//     return new Response(
//       JSON.stringify({ message: "Data saved successfully" }),
//       { status: 200 }
//     );
//   } catch (err) {
//     console.error("Error in assign-control route:", err.message);
//     return new Response(JSON.stringify({ message: "Server error" }), {
//       status: 500,
//     });
//   }
// }

// export const POST = withCORS(assignControl);


import { MongoClient } from "mongodb";
import { withCORS } from "../../../middleware/cors";

async function assignControl(req) {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ message: "Method not allowed" }), {
        status: 405,
      });
    }

    const body = await req.json();
    const {
      controlId,
      goal,
      function: func,
      description,
      guidance,
      evidences = [],
      ciso_email,
    } = body;

    const groupedByOwner = {};
    evidences.forEach((evi) => {
      if (!evi.owner) return;
      if (!groupedByOwner[evi.owner]) groupedByOwner[evi.owner] = [];
      groupedByOwner[evi.owner].push({
        name: evi.name,
        frequency: evi.frequency,
      });
    });

    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db("APEX");
    const collection = db.collection("owner_evidence");
    const auditCollection = db.collection("audit_trial");

    const inserts = [];

    for (const [ownerEmail, ownerEvidences] of Object.entries(groupedByOwner)) {
      for (const evidence of ownerEvidences) {
        // --- Normal owner_evidence flow (business side, not audit) ---
        const existingDoc = await collection.findOne({
          controlId,
          "evidences.name": evidence.name,
        });

        if (existingDoc) {
          const oldOwner = existingDoc.owner;
          const oldFrequency = existingDoc.evidences[0].frequency;

          if (oldOwner !== ownerEmail || oldFrequency !== evidence.frequency) {
            await collection.updateOne(
              { _id: existingDoc._id },
              {
                $set: {
                  owner: ownerEmail,
                  "evidences.0.frequency": evidence.frequency,
                  timestamp: new Date(),
                },
              }
            );
          }
        } else {
          inserts.push({
            owner: ownerEmail,
            controlId,
            goal,
            function: func,
            description,
            guidance,
            evidences: [evidence],
            status: "pending",
            timestamp: new Date(),
          });
        }

        // --- Audit trail flow ---
        const existingAudit = await auditCollection.findOne({
          ciso: ciso_email,
          controlId,
        });

        if (!existingAudit) {
          // First time → create doc with evidences array
          await auditCollection.insertOne({
            ciso: ciso_email,
            controlId,
            evidences: [
              {
                evidenceName: evidence.name,
                frequency: evidence.frequency, // original saved once
                owner: ownerEmail,             // original saved once
                assignedDate: new Date(),
              },
            ],
            createdAt: new Date(),
          });
        } else {
          // Evidence exists → check if already logged
          const evidenceIndex = existingAudit.evidences.findIndex(
            (e) => e.evidenceName === evidence.name
          );

          if (evidenceIndex === -1) {
            // New evidence
            await auditCollection.updateOne(
              { _id: existingAudit._id },
              {
                $push: {
                  evidences: {
                    evidenceName: evidence.name,
                    frequency: evidence.frequency,
                    owner: ownerEmail,
                    assignedDate: new Date(),
                  },
                },
              }
            );
          } else {
            const currentEvidence = existingAudit.evidences[evidenceIndex];
            let updateFields = {};
            let hasChanges = false;

            // 🔹 Owner change trail (compare with last reassignOwnerN if exists, else with original owner)
            let ownerIndex = 1;
            while (currentEvidence[`reassignOwner${ownerIndex}`]) {
              ownerIndex++;
            }
            const lastOwner =
              currentEvidence[`reassignOwner${ownerIndex - 1}`] ||
              currentEvidence.owner;

            if (ownerEmail !== lastOwner) {
              updateFields[`evidences.${evidenceIndex}.reassignOwner${ownerIndex}`] =
                ownerEmail;
              updateFields[`evidences.${evidenceIndex}.reassignOwnerDate${ownerIndex}`] =
                new Date();
              hasChanges = true;
            }

            // 🔹 Frequency change trail (compare with last frequencyChangeN if exists, else with original frequency)
            let freqIndex = 1;
            while (currentEvidence[`frequencyChange${freqIndex}`]) {
              freqIndex++;
            }
            const lastFreq =
              currentEvidence[`frequencyChange${freqIndex - 1}`] ||
              currentEvidence.frequency;

            if (evidence.frequency !== lastFreq) {
              updateFields[`evidences.${evidenceIndex}.frequencyChange${freqIndex}`] =
                evidence.frequency;
              updateFields[`evidences.${evidenceIndex}.frequencyChangeDate${freqIndex}`] =
                new Date();
              hasChanges = true;
            }

            if (hasChanges) {
              await auditCollection.updateOne(
                { _id: existingAudit._id },
                { $set: updateFields }
              );
            }
          }
        }
      }
    }

    if (inserts.length > 0) {
      await collection.insertMany(inserts);
    }

    await client.close();

    return new Response(
      JSON.stringify({ message: "Data saved successfully" }),
      { status: 200 }
    );
  } catch (err) {
    console.error("Error in assign-control route:", err.message);
    return new Response(JSON.stringify({ message: "Server error" }), {
      status: 500,
    });
  }
}

export const POST = withCORS(assignControl);
