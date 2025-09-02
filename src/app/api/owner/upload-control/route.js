import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { MongoClient } from "mongodb";
import { withCORS } from "../../../middleware/cors";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

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
      return new Response(JSON.stringify({ message: "Missing files or email" }), { status: 400 });
    }

    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db("APEX");
    const collection = db.collection("owner_evidence");

    const uploadResults = [];

    for (const file of files) {
      const { fileName, base64PDF } = file;
      if (!fileName || !base64PDF) continue;

      const buffer = Buffer.from(base64PDF, "base64");

      // Upload to S3
      await s3.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType: "application/pdf",
      }));

      const signedUrl = await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: fileName,
        }),
        { expiresIn: 60 * 60 * 24 }
      );

      // Parse controlId and evidenceName
      const [controlId, ...restParts] = fileName.replace(".pdf", "").split("_");
      let evidenceName = restParts.join("_");
      evidenceName = evidenceName.replace(/_(Month|Q)\d+$/, "");

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
          $unset: {
            "evidences.$[evi].files.$[fileElem].comment": "", 
          },
        },
        {
          arrayFilters: [
            { "evi.name": evidenceName },
            { "fileElem.fileName": fileName },
          ],
        }
      );
      

      let replaced = updateExisting.modifiedCount > 0;

      // If not replaced, then push as a new file entry
      if (!replaced) {
        await collection.updateOne(
          {
            owner: email,
            controlId,
            "evidences.name": evidenceName,
          },
          {
            $set: {
              status: "pending-approval",
            },
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

      uploadResults.push({
        fileName,
        fileUrl: signedUrl,
        replaced,
      });
    }

    await client.close();

    return new Response(
      JSON.stringify({
        message: "Files uploaded and database updated",
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
