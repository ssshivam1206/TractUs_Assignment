import { ContractDetailPage } from '@/components/contract-detail-page';
import { OrganisationProvider } from '@/state/organisation-context';

export default async function ContractDetailRoute({
  params,
}: Readonly<{
  params: Promise<{ contractId: string }>;
}>) {
  const { contractId } = await params;

  return (
    <OrganisationProvider>
      <ContractDetailPage contractId={contractId} />
    </OrganisationProvider>
  );
}
