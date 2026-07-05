export type OrganisationApiObject = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type OrganisationCreateInput = {
  name: string;
};
