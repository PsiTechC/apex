// import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
// import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
// import { MongoClient } from "mongodb";
// import { withCORS } from "../../../middleware/cors";

// const s3 = new S3Client({
//   region: process.env.AWS_REGION,
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   },
// });

// async function uploadMultiplePDFs(req) {
//   try {
//     if (req.method !== "POST") {
//       return new Response(JSON.stringify({ message: "Method not allowed" }), {
//         status: 405,
//       });
//     }

//     const body = await req.json();
//     const { files, email } = body;

//     if (!files || !Array.isArray(files) || files.length === 0 || !email) {
//       return new Response(JSON.stringify({ message: "Missing files or email" }), { status: 400 });
//     }

//     const client = await MongoClient.connect(process.env.MONGO_URI);
//     const db = client.db("APEX");
//     const collection = db.collection("owner_evidence");

//     const uploadResults = [];

//     for (const file of files) {
//       const { fileName, base64PDF } = file;
//       if (!fileName || !base64PDF) continue;

//       const buffer = Buffer.from(base64PDF, "base64");

//       // Upload to S3
//       await s3.send(new PutObjectCommand({
//         Bucket: process.env.S3_BUCKET_NAME,
//         Key: fileName,
//         Body: buffer,
//         ContentType: "application/pdf",
//       }));

//       const signedUrl = await getSignedUrl(
//         s3,
//         new GetObjectCommand({
//           Bucket: process.env.S3_BUCKET_NAME,
//           Key: fileName,
//         }),
//         { expiresIn: 60 * 60 * 24 }
//       );

//       // Parse controlId and evidenceName
//       const [controlId, ...restParts] = fileName.replace(".pdf", "").split("_");
//       let evidenceName = restParts.join("_");
//       evidenceName = evidenceName.replace(/_(Month|Q)\d+$/, "");

//       const updateExisting = await collection.updateOne(
//         {
//           owner: email,
//           controlId,
//           "evidences.name": evidenceName,
//           "evidences.files.fileName": fileName,
//         },
//         {
//           $set: {
//             status: "pending-approval",
//             "evidences.$[evi].files.$[fileElem].url": signedUrl,
//             "evidences.$[evi].files.$[fileElem].uploadedAt": new Date(),
//             "evidences.$[evi].files.$[fileElem].status": "pending", 
//           },
//           $unset: {
//             "evidences.$[evi].files.$[fileElem].comment": "", 
//           },
//         },
//         {
//           arrayFilters: [
//             { "evi.name": evidenceName },
//             { "fileElem.fileName": fileName },
//           ],
//         }
//       );
      

//       let replaced = updateExisting.modifiedCount > 0;

//       // If not replaced, then push as a new file entry
//       if (!replaced) {
//         await collection.updateOne(
//           {
//             owner: email,
//             controlId,
//             "evidences.name": evidenceName,
//           },
//           {
//             $set: {
//               status: "pending-approval",
//             },
//             $push: {
//               "evidences.$.files": {
//                 url: signedUrl,
//                 fileName,
//                 uploadedAt: new Date(),
//                 status: "pending",
//               },
//             },
//           }
//         );
//       }

//       uploadResults.push({
//         fileName,
//         fileUrl: signedUrl,
//         replaced,
//       });
//     }

//     await client.close();

//     return new Response(
//       JSON.stringify({
//         message: "Files uploaded and database updated",
//         results: uploadResults,
//       }),
//       { status: 200 }
//     );

//   } catch (err) {
//     console.error("❌ Error uploading PDFs:", err.message);
//     return new Response(JSON.stringify({ message: "Server error" }), {
//       status: 500,
//     });
//   }
// }

// export const POST = withCORS(uploadMultiplePDFs);



// import { MongoClient } from "mongodb";
// import { withCORS } from "../../../middleware/cors";
// import fs from "fs";
// import path from "path";

// async function uploadMultiplePDFs(req) {
//   try {
//     if (req.method !== "POST") {
//       return new Response(JSON.stringify({ message: "Method not allowed" }), {
//         status: 405,
//       });
//     }

//     const body = await req.json();
//     const { files, email } = body;

//     if (!files || !Array.isArray(files) || files.length === 0 || !email) {
//       return new Response(JSON.stringify({ message: "Missing files or email" }), { status: 400 });
//     }

//     const client = await MongoClient.connect(process.env.MONGO_URI);
//     const db = client.db("APEX");
//     const collection = db.collection("owner_evidence");

//     const uploadResults = [];

//     for (const file of files) {
//       const { fileName, base64PDF } = file;
//       if (!fileName || !base64PDF) continue;

//       const buffer = Buffer.from(base64PDF, "base64");

//       // ✅ Save to local folder instead of S3
//       const uploadDir = path.join(process.cwd(), "uploads");
//       if (!fs.existsSync(uploadDir)) {
//         fs.mkdirSync(uploadDir, { recursive: true });
//       }
//       const filePath = path.join(uploadDir, fileName);
//       fs.writeFileSync(filePath, buffer);

//       // Local file URL (assuming /uploads is served statically)
//       const signedUrl = `/uploads/${fileName}`;

//       // Parse controlId and evidenceName
//       const [controlId, ...restParts] = fileName.replace(".pdf", "").split("_");
//       let evidenceName = restParts.join("_");
//       evidenceName = evidenceName.replace(/_(Month|Q)\d+$/, "");

//       const updateExisting = await collection.updateOne(
//         {
//           owner: email,
//           controlId,
//           "evidences.name": evidenceName,
//           "evidences.files.fileName": fileName,
//         },
//         {
//           $set: {
//             status: "pending-approval",
//             "evidences.$[evi].files.$[fileElem].url": signedUrl,
//             "evidences.$[evi].files.$[fileElem].uploadedAt": new Date(),
//             "evidences.$[evi].files.$[fileElem].status": "pending",
//           },
//           $unset: {
//             "evidences.$[evi].files.$[fileElem].comment": "",
//           },
//         },
//         {
//           arrayFilters: [
//             { "evi.name": evidenceName },
//             { "fileElem.fileName": fileName },
//           ],
//         }
//       );

//       let replaced = updateExisting.modifiedCount > 0;

//       // If not replaced, then push as a new file entry
//       if (!replaced) {
//         await collection.updateOne(
//           {
//             owner: email,
//             controlId,
//             "evidences.name": evidenceName,
//           },
//           {
//             $set: {
//               status: "pending-approval",
//             },
//             $push: {
//               "evidences.$.files": {
//                 url: signedUrl,
//                 fileName,
//                 uploadedAt: new Date(),
//                 status: "pending",
//               },
//             },
//           }
//         );
//       }

//       uploadResults.push({
//         fileName,
//         fileUrl: signedUrl,
//         replaced,
//       });
//     }

//     await client.close();

//     return new Response(
//       JSON.stringify({
//         message: "Files uploaded and database updated (local uploads)",
//         results: uploadResults,
//       }),
//       { status: 200 }
//     );
//   } catch (err) {
//     console.error("❌ Error uploading PDFs:", err.message);
//     return new Response(JSON.stringify({ message: "Server error" }), {
//       status: 500,
//     });
//   }
// }

// export const POST = withCORS(uploadMultiplePDFs);



import { MongoClient } from "mongodb";
import { withCORS } from "../../../middleware/cors";
import fs from "fs";
import path from "path";

async function uploadMultiplePDFs(req) {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ message: "Method not allowed" }), {
        status: 405,
      });
    }

    const body = await req.json();
    const { files, email } = body;

    if (!files || !Array.isArray(files) || files.length === 0 || !email) {
      return new Response(
        JSON.stringify({ message: "Missing files or email" }),
        { status: 400 }
      );
    }

    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db("APEX");
    const collection = db.collection("owner_evidence");
    const auditCollection = db.collection("audit_trial");

    const uploadResults = [];

    for (const file of files) {
      const { fileName, base64PDF } = file;
      if (!fileName || !base64PDF) continue;

      const buffer = Buffer.from(base64PDF, "base64");

      // Save locally (testing)
      const uploadDir = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, buffer);

      const signedUrl = `/uploads/${fileName}`;

      // Parse controlId, evidenceName, period
      const base = fileName.replace(/\.pdf$/i, "");
      const [controlId, ...restParts] = base.split("_");
      let evidenceName = restParts.join("_");
      // strip trailing _MonthN/_Qn for evidenceName
      evidenceName = evidenceName.replace(/_(Month\d+|Q\d+)$/i, "");

      // Derive period from fileName (Q1/M1/Y1)
      let period = "Y1";
      const qMatch = fileName.match(/_Q(\d+)\.pdf$/i);
      const mMatch = fileName.match(/_Month(\d+)\.pdf$/i);
      if (qMatch) period = `Q${qMatch[1]}`;
      else if (mMatch) period = `M${mMatch[1]}`;

      // Update owner_evidence (unchanged behavior)
      const updateExisting = await collection.updateOne(
        {
          owner: email,
          controlId,
          "evidences.name": evidenceName,
          "evidences.files.fileName": fileName,
        },
        {
          $set: {
            status: "pending-approval",
            "evidences.$[evi].files.$[fileElem].url": signedUrl,
            "evidences.$[evi].files.$[fileElem].uploadedAt": new Date(),
            "evidences.$[evi].files.$[fileElem].status": "pending",
          },
          $unset: { "evidences.$[evi].files.$[fileElem].comment": "" },
        },
        {
          arrayFilters: [
            { "evi.name": evidenceName },
            { "fileElem.fileName": fileName },
          ],
        }
      );

      let replaced = updateExisting.modifiedCount > 0;

      if (!replaced) {
        await collection.updateOne(
          {
            owner: email,
            controlId,
            "evidences.name": evidenceName,
          },
          {
            $set: { status: "pending-approval" },
            $push: {
              "evidences.$.files": {
                url: signedUrl,
                fileName,
                uploadedAt: new Date(),
                status: "pending",
              },
            },
          }
        );
      }

      // ---- Audit trail update (match by fileName to handle re-uploads) ----
      const auditDoc = await auditCollection.findOne({ controlId });
      if (auditDoc) {
        const evidenceIndex = auditDoc.evidences.findIndex(
          (e) => e.evidenceName === evidenceName
        );

        if (evidenceIndex !== -1) {
          const currentEvidence = auditDoc.evidences[evidenceIndex];
          const freq = currentEvidence.frequency;
          const uploads = currentEvidence.docUploads || [];

          // 1) Try to find an existing entry by EXACT fileName (e.g., C003_Evidence 1_Q1.pdf)
          let byNameIdx = uploads.findIndex(
            (u) => u.fileName === fileName && u.uploadedBy === email
          );

          if (byNameIdx !== -1) {
            // Re-upload to the SAME period/fileName → append reuploadUrlN/reuploadDateN
            const existing = uploads[byNameIdx];

            // find next available N
            let next = 2;
            while (existing[`reuploadUrl${next}`]) next++;

            const setFields = {
              [`evidences.${evidenceIndex}.docUploads.${byNameIdx}.reuploadUrl${next}`]:
                signedUrl,
              [`evidences.${evidenceIndex}.docUploads.${byNameIdx}.reuploadDate${next}`]:
                new Date(),
            };

            await auditCollection.updateOne(
              { _id: auditDoc._id },
              { $set: setFields }
            );
          } else {
            // 2) If not found by fileName, also check same evidence+freq+period+uploader (safety net)
            const byMetaIdx = uploads.findIndex(
              (u) =>
                u.evidenceName === evidenceName &&
                u.frequency === freq &&
                u.period === period &&
                u.uploadedBy === email
            );

            if (byMetaIdx !== -1) {
              const existing = uploads[byMetaIdx];
              let next = 2;
              while (existing[`reuploadUrl${next}`]) next++;

              const setFields = {
                [`evidences.${evidenceIndex}.docUploads.${byMetaIdx}.reuploadUrl${next}`]:
                  signedUrl,
                [`evidences.${evidenceIndex}.docUploads.${byMetaIdx}.reuploadDate${next}`]:
                  new Date(),
              };

              await auditCollection.updateOne(
                { _id: auditDoc._id },
                { $set: setFields }
              );
            } else {
              // First upload for this file/period → create new entry
              await auditCollection.updateOne(
                { _id: auditDoc._id },
                {
                  $push: {
                    [`evidences.${evidenceIndex}.docUploads`]: {
                      evidenceName,
                      frequency: freq,
                      period, // parsed from fileName
                      url: signedUrl,
                      fileName,
                      uploadedAt: new Date(),
                      uploadedBy: email,
                    },
                  },
                }
              );
            }
          }
        }
      }
      // --------------------------------------------------------------------

      uploadResults.push({
        fileName,
        fileUrl: signedUrl,
        replaced,
      });
    }

    await client.close();

    return new Response(
      JSON.stringify({
        message: "Files uploaded and audit trail updated",
        results: uploadResults,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Error uploading PDFs:", err.message);
    return new Response(JSON.stringify({ message: "Server error" }), {
      status: 500,
    });
  }
}

export const POST = withCORS(uploadMultiplePDFs);
