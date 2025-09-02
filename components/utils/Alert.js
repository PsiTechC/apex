"use client";
import { useEffect } from "react";
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaExclamationCircle,
} from "react-icons/fa";

const icons = {
  success: <FaCheckCircle className="text-green-700 text-2xl mr-3" />,
  warning: <FaExclamationTriangle className="text-yellow-700 text-2xl mr-3" />,
  danger: <FaExclamationCircle className="text-red-700 text-2xl mr-3" />,
};

const styles = {
  success: "bg-green-100 text-green-800 border-green-400",
  warning: "bg-yellow-100 text-yellow-800 border-yellow-400",
  danger: "bg-red-100 text-red-800 border-red-400",
};

export default function Alert({
  type = "success",
  message,
  onConfirm,
  onCancel,
  isConfirm = false,
  onClose,
}) {
  useEffect(() => {
    if (!isConfirm) {
      const timer = setTimeout(() => onClose?.(), 4000);
      return () => clearTimeout(timer);
    }
  }, [isConfirm]);

  return (
    <div
      className={`fixed top-6 right-4 sm:right-6 z-50 w-[95vw] sm:w-[400px] rounded-lg shadow-lg border px-6 py-5 flex flex-col gap-4 ${styles[type]}`}
      style={{ transition: "all 0.3s ease-in-out" }}
    >
      <div className="flex items-start gap-3">
        {icons[type]}
        <p className="text-base font-semibold leading-snug">{message}</p>
      </div>

      {isConfirm && (
        <div className="flex justify-end gap-3">
          <button
            onClick={onConfirm}
            className="bg-black text-white text-sm px-4 py-1.5 rounded hover:bg-gray-800"
          >
            Confirm
          </button>
          <button
            onClick={onCancel}
            className="bg-white text-black border border-gray-400 text-sm px-4 py-1.5 rounded hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
