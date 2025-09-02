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
    } = body;

    const groupedByOwner = {};

    evidences.forEach((evi) => {
      if (!evi.owner) return;

      if (!groupedByOwner[evi.owner]) {
        groupedByOwner[evi.owner] = [];
      }

      groupedByOwner[evi.owner].push({
        name: evi.name,
        frequency: evi.frequency,
      });
    });

    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db("APEX");
    const collection = db.collection("owner_evidence");

    const inserts = [];

    for (const [ownerEmail, ownerEvidences] of Object.entries(groupedByOwner)) {
      for (const evidence of ownerEvidences) {
        const existingDoc = await collection.findOne({
          controlId,
          "evidences.name": evidence.name,
        });
    
        if (existingDoc) {
          const oldOwner = existingDoc.owner;
    
          if (oldOwner !== ownerEmail || existingDoc.evidences[0].frequency !== evidence.frequency) {
            // Owner or frequency changed → update
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
            console.log(`Updated evidence ${evidence.name} for control ${controlId}`);
          } else {
            console.log(`No change detected for evidence ${evidence.name}`);
          }
    
        } else {
          // New entry
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
      }
    }
    

    if (inserts.length > 0) {
      await collection.insertMany(inserts);
      console.log(`Inserted ${inserts.length} new document(s) into owner_evidence`);
    } else {
      console.log("No new entries to insert (all are duplicates)");
    }

    await client.close();

    return new Response(JSON.stringify({ message: "Data saved successfully" }), {
      status: 200,
    });

  } catch (err) {
    console.error("Error in assign-control route:", err.message);
    return new Response(JSON.stringify({ message: "Server error" }), {
      status: 500,
    });
  }
}

export const POST = withCORS(assignControl);
