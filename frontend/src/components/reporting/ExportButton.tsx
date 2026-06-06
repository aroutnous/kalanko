import { Download } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { getErrorMessage } from "@/lib/api";
import { downloadFile } from "@/lib/download";
import type { FormatExport } from "@/lib/reporting-api";
import { useToastStore } from "@/stores/toastStore";
import { useExportHistoryStore } from "@/stores/exportHistoryStore";

interface ExportButtonProps {
  label: string;
  url: string;
  params: Record<string, string>;
  pdfFilename: string;
  excelFilename: string;
  defaultFormat?: FormatExport;
}

export function ExportButton({
  label,
  url,
  params,
  pdfFilename,
  excelFilename,
  defaultFormat = "pdf",
}: ExportButtonProps): React.JSX.Element {
  const toast = useToastStore((s) => s.show);
  const addHistory = useExportHistoryStore((s) => s.add);
  const [format, setFormat] = useState<FormatExport>(defaultFormat);
  const [loading, setLoading] = useState(false);

  const handleExport = async (): Promise<void> => {
    setLoading(true);
    try {
      const exportParams = { ...params, format };
      if (format === "pdf") {
        await downloadFile(url, pdfFilename, "application/pdf", exportParams);
      } else {
        await downloadFile(
          url,
          excelFilename,
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          exportParams,
        );
      }
      addHistory(label, format);
      toast(`${label} téléchargé`);
    } catch (err) {
      toast(getErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={format}
        onChange={(e) => setFormat(e.target.value as FormatExport)}
        className="max-w-[120px]"
        disabled={loading}
      >
        <option value="pdf">PDF</option>
        <option value="excel">Excel</option>
      </Select>
      <Button onClick={() => void handleExport()} disabled={loading}>
        {loading ? (
          "Génération…"
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Télécharger
          </>
        )}
      </Button>
    </div>
  );
}
