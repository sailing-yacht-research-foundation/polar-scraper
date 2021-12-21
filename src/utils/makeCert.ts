import { v4 as uuidv4 } from 'uuid';

export default function makeCert(data: {
  organization: string;
  subOrganization: string;
  certType: string;
  builder: string | null | undefined;
  owner: string | null | undefined;
  certNumber: string | null | undefined;
  issuedDate: string | null | undefined;
  expireDate: string | null | undefined;
  measureDate: string | null | undefined;
  country: string | null | undefined;
  sailNumber: string | null | undefined;
  boatName: string | undefined;
  className: string | null | undefined;
  beam: string | null | undefined;
  draft: string | null | undefined;
  displacement: string | null | undefined;
  extras: string;
  hasPolars: boolean;
  polars: any; // TODO: Type this
  hasTimeAllowances: boolean;
  timeAllowances: any; // TODO: Type this
}) {
  const {
    organization,
    subOrganization,
    certType,
    builder,
    owner,
    certNumber,
    issuedDate,
    expireDate,
    measureDate,
    country,
    sailNumber,
    boatName,
    className,
    beam,
    draft,
    displacement,
    extras,
    hasPolars,
    polars,
    hasTimeAllowances,
    timeAllowances,
  } = data;
  return {
    syrfId: uuidv4(),
    organization,
    subOrganization,
    certType,
    builder,
    owner,
    certNumber,
    issuedDate: issuedDate ? new Date(issuedDate) : null,
    expireDate: expireDate ? new Date(expireDate) : null,
    measureDate,
    country,
    sailNumber,
    boatName,
    className,
    beam,
    draft,
    displacement,
    extras,
    hasPolars,
    polars,
    hasTimeAllowances,
    timeAllowances,
  };
}
