import { ContractCreatePage } from '@/components/contract-create-page';
import { OrganisationProvider } from '@/state/organisation-context';

export default function NewContractPage() {
  return (
    <OrganisationProvider>
      <ContractCreatePage />
    </OrganisationProvider>
  );
}
