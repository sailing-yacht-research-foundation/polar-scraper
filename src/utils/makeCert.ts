import { v4 as uuidv4 } from 'uuid';

export default function makeCert(data: {
  organization: string;
  subOrganization?: string;
  certType: string;
  builder?: string;
  owner?: string;
  certNumber?: string;
  issuedDate?: string;
  expireDate?: string;
  measureDate?: string;
  country?: string;
  sailNumber?: string;
  boatName?: string;
  className?: string;
  beam?: number;
  draft?: number;
  displacement?: number;
  extras: string;
  hasPolars: boolean;
  polars?: any; // TODO: Type this
  hasTimeAllowances: boolean;
  timeAllowances?: any; // TODO: Type this
  originalId: string;
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
    originalId,
  } = data;
  return {
    syrfId: uuidv4(),
    organization,
    subOrganization,
    certType,
    builder,
    owner: owner || null,
    certNumber,
    issuedDate: issuedDate ? new Date(issuedDate) : null,
    expireDate: expireDate ? new Date(expireDate) : null,
    measureDate: measureDate ? new Date(measureDate) : null,
    country,
    sailNumber,
    boatName,
    className,
    beam: beam || null,
    draft: draft || null,
    displacement: displacement || null,
    extras,
    hasPolars,
    polars,
    hasTimeAllowances,
    timeAllowances,
    originalId,
  };
}
