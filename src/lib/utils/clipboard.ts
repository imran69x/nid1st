import { ExtractedNIDFields } from "@/types/nid";

/**
 * Copies plain text to clipboard using the modern Navigator Clipboard API
 * with fallback to document.execCommand('copy') for older browsers / insecure contexts
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Fallback using textarea element
    const textArea = document.createElement("textarea");
    textArea.value = text;
    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    textArea.style.pointerEvents = "none";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error("Failed to copy text to clipboard:", err);
    return false;
  }
}

/**
 * Formats all extracted NID fields into a neat text block (one per line)
 */
export function formatAllFieldsForClipboard(fields: ExtractedNIDFields): string {
  return [
    `নাম (বাংলা): ${fields.nameBangla || "N/A"}`,
    `Name (English): ${fields.nameEnglish || "N/A"}`,
    `পিতার নাম (বাংলা): ${fields.fatherNameBangla || "N/A"}`,
    `Father's Name (English): ${fields.fatherNameEnglish || "N/A"}`,
    `মাতার নাম (বাংলা): ${fields.motherNameBangla || "N/A"}`,
    `Mother's Name (English): ${fields.motherNameEnglish || "N/A"}`,
    `NID Number: ${fields.nidNumber || "N/A"}`,
    `Date of Birth: ${fields.dateOfBirth || "N/A"}`,
  ].join("\n");
}
