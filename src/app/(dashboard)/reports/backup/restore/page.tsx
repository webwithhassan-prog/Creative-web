import { PageHeader } from "@/components/PageHeader";
import { RestoreBackupForm } from "@/components/RestoreBackupForm";
import { restoreBackup } from "../actions";

export default function RestoreBackupPage() {
  return (
    <>
      <PageHeader title="Restore Backup" subtitle="Load a Creative Accounts backup JSON file" />
      <RestoreBackupForm action={restoreBackup} />
    </>
  );
}
