import { MongoClient } from "mongodb";
import { withCORS } from "../../../middleware/cors";

async function getRiskControl(req) {
  if (req.method === "GET") {
    try {
      const { searchParams } = new URL(req.url);

      const emails =
        [...searchParams.getAll("email")]
          .flatMap((v) => v.split(","))
          .map((v) => v.trim().toLowerCase())
          .filter(Boolean);

      if (!emails.length) {
        return new Response(
          JSON.stringify({ message: "At least one email is required" }),
          { status: 400 }
        );
      }

      const client = await MongoClient.connect(process.env.MONGO_URI);
      const db = client.db("APEX");
      const collection = db.collection("control_risk");

      const query = { status: "risk", owner: { $in: emails } };

      const risks = await collection.find(query).sort({ timestamp: -1 }).toArray();

      await client.close();

      // 🔹 Format response so that:
      // - Control risks return controlId
      // - Other risks return date
      const formatted = risks.map((r) => {
        if (r.riskType === "control") {
          return {
            id: r._id.toString(), // ✅ include ObjectId
            riskType: "control",
            controlId: r.controlId,
            description: r.description,
            owner: r.owner,
            timestamp: r.timestamp,
          };
        }
        if (r.riskType === "other") {
          return {
            id: r._id.toString(), // ✅ include ObjectId
            riskType: "other",
            description: r.description,
            type: r.type,
            date: r.date,
            owner: r.owner,
            timestamp: r.timestamp,
          };
        }
        return {
          id: r._id.toString(),
          ...r,
        };
      });

      return new Response(
        JSON.stringify({
          message: "Risk controls fetched successfully",
          owners: emails,
          risks: formatted,
        }),
        { status: 200 }
      );
    } catch (err) {
      console.error("❌ Error fetching risk controls:", err);
      return new Response(JSON.stringify({ message: "Server error" }), {
        status: 500,
      });
    }
  }



  if (req.method === "POST") {
    try {
      const body = await req.json();
      const { riskType, controlId, description, type, date, ciso_email } = body;

      if (!ciso_email) {
        return new Response(
          JSON.stringify({ message: "ciso_email is required" }),
          { status: 400 }
        );
      }

      const client = await MongoClient.connect(process.env.MONGO_URI);
      const db = client.db("APEX");
      const collection = db.collection("control_risk");
      const auditCollection = db.collection("audit_trial");

      let doc;
      if (riskType === "control") {
        if (!controlId || !description) {
          return new Response(
            JSON.stringify({
              message: "controlId and description are required for control risks",
            }),
            { status: 400 }
          );
        }

        doc = {
          riskType: "control",
          controlId,
          description,
          status: "risk",
          owner: ciso_email.toLowerCase(),
          timestamp: new Date(),
        };

        // 🔹 Sync with audit_trial
        const auditDoc = await auditCollection.findOne({ controlId });
        if (auditDoc) {
          // update existing evidence with risk fields
          await auditCollection.updateOne(
            { controlId, "evidences.0": { $exists: true } },
            {
              $set: {
                "evidences.0.riskStatus": "risk",
                "evidences.0.riskAt": new Date(),
                "evidences.0.riskComment": description,
              },
            }
          );
        } else {
          // create minimal audit doc
          await auditCollection.insertOne({
            ciso: ciso_email.toLowerCase(),
            controlId,
            evidences: [
              {
                evidenceName: "Unknown Evidence", // or leave blank if not known here
                riskStatus: "risk",
                riskAt: new Date(),
                riskComment: description,
              },
            ],
            createdAt: new Date(),
          });
        }
      } else if (riskType === "other") {
        if (!description || !type || !date) {
          return new Response(
            JSON.stringify({
              message: "description, type, and date are required for other risks",
            }),
            { status: 400 }
          );
        }
        doc = {
          riskType: "other",
          description,
          type,
          date,
          status: "risk",
          owner: ciso_email.toLowerCase(),
          timestamp: new Date(),
        };
      } else {
        return new Response(
          JSON.stringify({
            message: "Invalid riskType. Must be 'control' or 'other'.",
          }),
          { status: 400 }
        );
      }

      const result = await collection.insertOne(doc);
      await client.close();

      return new Response(
        JSON.stringify({
          message: "Risk added successfully",
          insertedId: result.insertedId,
        }),
        { status: 201 }
      );
    } catch (err) {
      console.error("❌ Error adding risk control:", err);
      return new Response(JSON.stringify({ message: "Server error" }), {
        status: 500,
      });
    }
  }


  return new Response(JSON.stringify({ message: "Method not allowed" }), {
    status: 405,
  });
}

export const GET = withCORS(getRiskControl);
export const POST = withCORS(getRiskControl);
