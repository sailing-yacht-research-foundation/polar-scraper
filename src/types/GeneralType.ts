export type ElasticSearchQueryResult<T> = {
  data: {
    _scroll_id?: string;
    hits: {
      hits: {
        _index: string;
        _type: string;
        _id: string;
        score: number;
        _ignored: string[];
        _source: T;
      }[];
    };
  };
};

export type Polar = {
  windSpeeds: number[];
  beatAngles: number[];
  beatVMGs: number[];
  polars: {
    twa: number;
    speeds: number[];
  }[];
  runVMGs: number[];
  gybeAngles: number[];
};

export type TimeAllowance = {
  windSpeeds: number[];
  beatVMGs: number[];
  timeAllowances: {
    twa: number;
    speeds: number[];
  }[];
  runVMGs: number[];
  gybeAngles?: number[];
};

export type MakeCertParam = {
  organization: string;
  subOrganization?: string;
  certType?: string;
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
  polars?: Polar;
  hasTimeAllowances: boolean;
  timeAllowances?: TimeAllowance;
  originalId: string;
};

export type ExistingCertData = {
  syrfId: string;
  organization: string;
  certType: string | null;
  certNumber?: string;
  originalId: string;
  boatName?: string;
  issuedDate?: string;
  country?: string;
  builder?: string;
};
