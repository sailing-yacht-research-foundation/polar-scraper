import { v4 as uuidv4 } from 'uuid';

export default function makeCert(data: {
  organization: string;
  subOrganization: string;
  certType: string;
  builder: string;
  owner: string;
  certNumber: string;
  issuedDate: string;
  expireDate: string;
  measureDate: string;
  country: string;
  sailNumber: string;
  boatName: string;
  className: string;
  beam: string;
  draft: string;
  displacement: string;
  extras: string;
  hasPolars: boolean;
  polars: string;
  hasTimeAllowances: boolean;
  timeAllowances: string;
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
  };
}
