// "use client";

// import { useState } from "react";

// export default function EvidenceUploadModal({
//     controlId,
//     goal,
//     function: func,
//     description,
//     guidance,
//     evidence,
//     email,
//     onClose,
// }) {
//     const [selectedFiles, setSelectedFiles] = useState([]);

//     const [uploading, setUploading] = useState(false);
//     const [uploadMessage, setUploadMessage] = useState("");

//     const handleFileChange = (file, index) => {
//         const updated = [...selectedFiles];
//         updated[index] = file;
//         setSelectedFiles(updated);
//     };


//     const getFrequencyCount = () => {
//         if (evidence.frequency.toLowerCase() === "monthly") return 12;
//         if (evidence.frequency.toLowerCase() === "quarterly") return 4;
//         return 1; // yearly
//     };

//     const frequencyCount = getFrequencyCount();

//     const atLeastOneSelected = selectedFiles.some(Boolean);



//     const handleUpload = async () => {
//         if (!atLeastOneSelected) return;

//         setUploading(true);
//         try {
//             const files = await Promise.all(
//                 selectedFiles
//                     .map((file, index) => ({ file, index }))
//                     .filter(({ file }) => file)
//                     .map(async ({ file, index }) => {

//                         const buffer = await file.arrayBuffer();
//                         const base64PDF = Buffer.from(buffer).toString("base64");

//                         const suffix =
//                             frequencyCount === 1
//                                 ? ""
//                                 : evidence.frequency.toLowerCase() === "monthly"
//                                     ? `_Month${index + 1}`
//                                     : `_Q${index + 1}`;

//                         const fileName = `${controlId}_${evidence.name}${suffix}.pdf`;

//                         return {
//                             fileName,
//                             base64PDF,
//                         };
//                     })
//             );

//             const res = await fetch("/api/owner/upload-control", {
//                 method: "POST",
//                 headers: {
//                     "Content-Type": "application/json",
//                 },
//                 body: JSON.stringify({ files, email }),
//             });


//             if (res.ok) {
//                 setUploadMessage("✅ All files uploaded successfully!");
//             } else {
//                 setUploadMessage("❌ Some files failed to upload.");
//             }

//         } catch (err) {
//             console.error("Upload error:", err);
//             setUploadMessage("❌ Upload error occurred.");
//         } finally {
//             setUploading(false);
//         }
//     };



//     return (
//         <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex justify-center items-center z-50">
//             <div className="bg-white w-full max-w-3xl rounded-lg shadow-lg p-6 max-h-[90vh] overflow-y-auto">
//                 <h2 className="text-lg font-semibold text-gray-800 mb-4">Upload Evidence PDF</h2>

//                 {/* Top Fields */}
//                 <div className="grid grid-cols-4 gap-4 mb-4 text-sm">
//                     <div>
//                         <label className="block font-semibold text-gray-600 mb-1">Financial Year</label>
//                         <input
//                             type="text"
//                             value="2025–2026"
//                             readOnly
//                             className="w-full border border-gray-300 px-3 py-2 rounded bg-gray-100"
//                         />
//                     </div>
//                     <div>
//                         <label className="block font-semibold text-gray-600 mb-1">Goal</label>
//                         <input
//                             type="text"
//                             value={goal || "-"}
//                             readOnly
//                             className="w-full border border-gray-300 px-3 py-2 rounded bg-gray-100"
//                         />
//                     </div>
//                     <div>
//                         <label className="block font-semibold text-gray-600 mb-1">Function</label>
//                         <input
//                             type="text"
//                             value={func || "-"}
//                             readOnly
//                             className="w-full border border-gray-300 px-3 py-2 rounded bg-gray-100"
//                         />
//                     </div>
//                 </div>

//                 {/* Description & Guidance */}
//                 <div className="mb-4">
//                     <label className="block text-sm font-semibold text-gray-600 mb-1">Control Description</label>
//                     <textarea
//                         readOnly
//                         value={description || "-"}
//                         rows={3}
//                         className="w-full border border-gray-300 px-3 py-2 rounded bg-gray-100 text-sm"
//                     />
//                 </div>

//                 <div className="mb-6">
//                     <label className="block text-sm font-semibold text-gray-600 mb-1">Compliance Guidance</label>
//                     <textarea
//                         readOnly
//                         value={guidance || "-"}
//                         rows={3}
//                         className="w-full border border-gray-300 px-3 py-2 rounded bg-gray-100 text-sm"
//                     />
//                 </div>

//                 {/* Evidence Info */}
//                 <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
//                     <div>
//                         <label className="block font-semibold text-gray-600 mb-1">Evidence Name</label>
//                         <input
//                             type="text"
//                             value={evidence.name}
//                             readOnly
//                             className="w-full border border-gray-300 px-3 py-2 rounded bg-gray-100"
//                         />
//                     </div>
//                     <div>
//                         <label className="block font-semibold text-gray-600 mb-1">Frequency</label>
//                         <input
//                             type="text"
//                             value={evidence.frequency}
//                             readOnly
//                             className="w-full border border-gray-300 px-3 py-2 rounded bg-gray-100"
//                         />
//                     </div>
//                 </div>

//                 <div className="mb-6">
//                     <label className="block text-sm font-semibold text-gray-600 mb-2">
//                         {frequencyCount > 1 ? `Upload ${frequencyCount} PDFs` : "Upload PDF"}
//                     </label>

//                     <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
//                         {Array.from({ length: frequencyCount }, (_, i) => {
//                             const suffix =
//                                 frequencyCount === 1
//                                     ? ""
//                                     : evidence.frequency.toLowerCase() === "monthly"
//                                         ? `_Month${i + 1}`
//                                         : `_Q${i + 1}`;
//                             const expectedFileName = `${controlId}_${evidence.name}${suffix}.pdf`;
//                             const matchedFile = evidence.files?.find((f) => f.fileName === expectedFileName);

//                             const isRejected = matchedFile?.status === "rejected";
//                             const isApproved = matchedFile?.status === "approved";
//                             const isPending = matchedFile?.status === "pending";

//                             const label =
//                                 evidence.frequency.toLowerCase() === "monthly"
//                                     ? `Month ${i + 1}`
//                                     : evidence.frequency.toLowerCase() === "quarterly"
//                                         ? `Q${i + 1}`
//                                         : "Document";

//                             return (
//                                 <div key={i} className="flex flex-col items-start">
//                                     <label
//                                         htmlFor={`file-input-${i}`}
//                                         className={`px-3 py-1 rounded text-xs cursor-pointer border transition
//     ${isRejected
//                                                 ? "bg-red-100 text-red-700 border-red-300 hover:bg-red-200"
//                                                 : isPending
//                                                     ? "bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200"
//                                                     : isApproved
//                                                         ? "bg-green-100 text-green-700 border-green-300 hover:bg-green-200"
//                                                         : "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200"}
//   `}
//                                     >
//                                         {isPending ? `Pending review` : label}
//                                     </label>
//                                     <input
//                                         id={`file-input-${i}`}
//                                         type="file"
//                                         accept="application/pdf"
//                                         disabled={isApproved}
//                                         onChange={(e) => handleFileChange(e.target.files?.[0] || null, i)}
//                                         className="hidden"
//                                     />


//                                     {!isApproved && selectedFiles[i] && (
//                                         <div className="mt-1 text-xs text-gray-700 bg-gray-50 border border-gray-300 rounded px-2 py-1 w-full">
//                                             📎 {selectedFiles[i].name}
//                                         </div>
//                                     )}

//                                     {/* Show status messages as before */}
//                                     {isRejected && (
//                                         <div className="mt-1 text-xs text-red-600 bg-red-50 border border-red-300 rounded px-2 py-1 w-full">
//                                             ❌ Rejected: <span className="italic">{matchedFile.comment || "No reason provided."}</span>
//                                         </div>
//                                     )}

//                                     {isApproved && (
//                                         <div className="mt-1 text-xs text-green-600 bg-green-50 border border-green-300 rounded px-2 py-1 w-full">
//                                             ✅ Approved
//                                         </div>
//                                     )}



//                                 </div>
//                             );
//                         })}
//                     </div>

//                     {uploadMessage && (
//                         <p className={`mt-4 text-sm ${uploadMessage.startsWith("✅") ? "text-green-600" : "text-red-600"}`}>
//                             {uploadMessage}
//                         </p>
//                     )}
//                 </div>



//                 {/* Footer */}
//                 <div className="flex justify-end gap-4 mt-6">
//                     <button
//                         onClick={onClose}
//                         className="bg-gray-200 hover:bg-gray-300 text-sm text-gray-800 px-4 py-2 rounded"
//                     >
//                         Close
//                     </button>
//                     <button
//                         onClick={handleUpload}
//                         disabled={!atLeastOneSelected || uploading}

//                         className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-5 py-2 rounded disabled:opacity-50"
//                     >
//                         {uploading ? "Uploading..." : "Upload PDF"}
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// }


"use client";

import { useState } from "react";

export default function EvidenceUploadModal({
    controlId,
    goal,
    function: func,
    description,
    guidance,
    evidence,
    email,
    onClose,
}) {
    const [selectedFiles, setSelectedFiles] = useState([]);

    const [uploading, setUploading] = useState(false);
    const [uploadMessage, setUploadMessage] = useState("");

    const handleFileChange = (file, index) => {
        const updated = [...selectedFiles];
        updated[index] = file;
        setSelectedFiles(updated);
    };


    const getFrequencyCount = () => {
        if (evidence.frequency.toLowerCase() === "monthly") return 12;
        if (evidence.frequency.toLowerCase() === "quarterly") return 4;
        return 1; // yearly
    };

    const frequencyCount = getFrequencyCount();

    const atLeastOneSelected = selectedFiles.some(Boolean);



    const handleUpload = async () => {
        if (!atLeastOneSelected) return;

        setUploading(true);
        try {
            const files = await Promise.all(
                selectedFiles
                    .map((file, index) => ({ file, index }))
                    .filter(({ file }) => file)
                    .map(async ({ file, index }) => {

                        const buffer = await file.arrayBuffer();
                        const base64PDF = Buffer.from(buffer).toString("base64");

                        const suffix =
                            frequencyCount === 1
                                ? ""
                                : evidence.frequency.toLowerCase() === "monthly"
                                    ? `_Month${index + 1}`
                                    : `_Q${index + 1}`;

                        const fileName = `${controlId}_${evidence.name}${suffix}.pdf`;

                        return {
                            fileName,
                            base64PDF,
                        };
                    })
            );

            const res = await fetch("/api/owner/upload-control", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ files, email }),
            });


            if (res.ok) {
                setUploadMessage("✅ All files uploaded successfully!");
            } else {
                setUploadMessage("❌ Some files failed to upload.");
            }

        } catch (err) {
            console.error("Upload error:", err);
            setUploadMessage("❌ Upload error occurred.");
        } finally {
            setUploading(false);
        }
    };



    return (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex justify-center items-center z-50">
            <div className="bg-white w-full max-w-3xl rounded-lg shadow-lg p-6 max-h-[90vh] overflow-y-auto">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Upload Evidence PDF</h2>

                {/* Top Fields */}
                <div className="grid grid-cols-4 gap-4 mb-4 text-sm">
                    <div>
                        <label className="block font-semibold text-gray-600 mb-1">Financial Year</label>
                        <input
                            type="text"
                            value="2025–2026"
                            readOnly
                            className="w-full border border-gray-300 px-3 py-2 rounded bg-gray-100"
                        />
                    </div>
                    <div>
                        <label className="block font-semibold text-gray-600 mb-1">Goal</label>
                        <input
                            type="text"
                            value={goal || "-"}
                            readOnly
                            className="w-full border border-gray-300 px-3 py-2 rounded bg-gray-100"
                        />
                    </div>
                    <div>
                        <label className="block font-semibold text-gray-600 mb-1">Function</label>
                        <input
                            type="text"
                            value={func || "-"}
                            readOnly
                            className="w-full border border-gray-300 px-3 py-2 rounded bg-gray-100"
                        />
                    </div>
                </div>

                {/* Description & Guidance */}
                <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Control Description</label>
                    <textarea
                        readOnly
                        value={description || "-"}
                        rows={3}
                        className="w-full border border-gray-300 px-3 py-2 rounded bg-gray-100 text-sm"
                    />
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Compliance Guidance</label>
                    <textarea
                        readOnly
                        value={guidance || "-"}
                        rows={3}
                        className="w-full border border-gray-300 px-3 py-2 rounded bg-gray-100 text-sm"
                    />
                </div>

                {/* Evidence Info */}
                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                    <div>
                        <label className="block font-semibold text-gray-600 mb-1">Evidence Name</label>
                        <input
                            type="text"
                            value={evidence.name}
                            readOnly
                            className="w-full border border-gray-300 px-3 py-2 rounded bg-gray-100"
                        />
                    </div>
                    <div>
                        <label className="block font-semibold text-gray-600 mb-1">Frequency</label>
                        <input
                            type="text"
                            value={evidence.frequency}
                            readOnly
                            className="w-full border border-gray-300 px-3 py-2 rounded bg-gray-100"
                        />
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-600 mb-2">
                        {frequencyCount > 1 ? `Upload ${frequencyCount} PDFs` : "Upload PDF"}
                    </label>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {Array.from({ length: frequencyCount }, (_, i) => {
                            const suffix =
                                frequencyCount === 1
                                    ? ""
                                    : evidence.frequency.toLowerCase() === "monthly"
                                        ? `_Month${i + 1}`
                                        : `_Q${i + 1}`;
                            const expectedFileName = `${controlId}_${evidence.name}${suffix}.pdf`;
                            const matchedFile = evidence.files?.find((f) => f.fileName === expectedFileName);

                            const isRejected = matchedFile?.status === "rejected";
                            const isApproved = matchedFile?.status === "approved";
                            const isPending = matchedFile?.status === "pending";

                            const label =
                                evidence.frequency.toLowerCase() === "monthly"
                                    ? `Month ${i + 1}`
                                    : evidence.frequency.toLowerCase() === "quarterly"
                                        ? `Q${i + 1}`
                                        : "Document";

                            // ✅ Sequential upload logic
                            let isDisabled = false;
                            if (i > 0) {
                                const prevSuffix =
                                    evidence.frequency.toLowerCase() === "monthly"
                                        ? `_Month${i}`
                                        : `_Q${i}`;
                                const prevFileName = `${controlId}_${evidence.name}${prevSuffix}.pdf`;
                                const prevFile = evidence.files?.find((f) => f.fileName === prevFileName);

                                if (!prevFile || prevFile.status !== "approved") {
                                    isDisabled = true;
                                }
                            }

                            return (
                                <div key={i} className="flex flex-col items-start">
                                    <label
                                        htmlFor={`file-input-${i}`}
                                        className={`px-3 py-1 rounded text-xs cursor-pointer border transition
          ${isRejected
                                                ? "bg-red-100 text-red-700 border-red-300 hover:bg-red-200"
                                                : isPending
                                                    ? "bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200"
                                                    : isApproved
                                                        ? "bg-green-100 text-green-700 border-green-300 hover:bg-green-200"
                                                        : isDisabled
                                                            ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
                                                            : "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200"}
        `}
                                    >
                                        {isPending ? `Pending review` : label}
                                    </label>
                                    <input
                                        id={`file-input-${i}`}
                                        type="file"
                                        accept="application/pdf"
                                        disabled={isApproved || isDisabled}
                                        onChange={(e) => handleFileChange(e.target.files?.[0] || null, i)}
                                        className="hidden"
                                    />

                                    {!isApproved && selectedFiles[i] && (
                                        <div className="mt-1 text-xs text-gray-700 bg-gray-50 border border-gray-300 rounded px-2 py-1 w-full">
                                            📎 {selectedFiles[i].name}
                                        </div>
                                    )}

                                    {isRejected && (
                                        <div className="mt-1 text-xs text-red-600 bg-red-50 border border-red-300 rounded px-2 py-1 w-full">
                                            ❌ Rejected: <span className="italic">{matchedFile.comment || "No reason provided."}</span>
                                        </div>
                                    )}

                                    {isApproved && (
                                        <div className="mt-1 text-xs text-green-600 bg-green-50 border border-green-300 rounded px-2 py-1 w-full">
                                            ✅ Approved
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                    </div>

                    {uploadMessage && (
                        <p className={`mt-4 text-sm ${uploadMessage.startsWith("✅") ? "text-green-600" : "text-red-600"}`}>
                            {uploadMessage}
                        </p>
                    )}
                </div>



                {/* Footer */}
                <div className="flex justify-end gap-4 mt-6">
                    <button
                        onClick={onClose}
                        className="bg-gray-200 hover:bg-gray-300 text-sm text-gray-800 px-4 py-2 rounded"
                    >
                        Close
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={!atLeastOneSelected || uploading}

                        className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-5 py-2 rounded disabled:opacity-50"
                    >
                        {uploading ? "Uploading..." : "Upload PDF"}
                    </button>
                </div>
            </div>
        </div>
    );
}
