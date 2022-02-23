import { v4 as uuidv4 } from 'uuid';

import { MakeCertParam } from '../types/GeneralType';

export default function makeCert(data: MakeCertParam) {
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
    hasTimeAllowances,
    originalId,
  } = data;
  let time_allowances;
  if (data.timeAllowances) {
    const { windSpeeds, beatVMGs, timeAllowances, runVMGs, gybeAngles } =
      data.timeAllowances;
    time_allowances = {
      wind_speeds: windSpeeds,
      beat_vmgs: beatVMGs,
      time_allowances: timeAllowances,
      run_vmgs: runVMGs,
      gybe_angles: gybeAngles,
    };
  }
  let polars;
  if (data.polars) {
    const {
      windSpeeds,
      beatAngles,
      beatVMGs,
      polars: polarValues,
      runVMGs,
      gybeAngles,
    } = data.polars;
    polars = {
      wind_speeds: windSpeeds,
      beat_angles: beatAngles,
      beat_vmgs: beatVMGs,
      polars: polarValues,
      run_vmgs: runVMGs,
      gybe_angles: gybeAngles,
    };
  }
  return {
    syrf_id: uuidv4(),
    organization,
    sub_organization: subOrganization,
    cert_type: certType,
    builder,
    owner: owner || null,
    cert_number: certNumber,
    issued_date: issuedDate ? new Date(issuedDate) : null,
    expire_date: expireDate ? new Date(expireDate) : null,
    measure_date: measureDate ? new Date(measureDate) : null,
    country,
    sail_number: sailNumber,
    boat_name: boatName,
    class_name: className,
    beam: beam || null,
    draft: draft || null,
    displacement: displacement || null,
    extras,
    has_polars: hasPolars,
    polars,
    has_time_allowances: hasTimeAllowances,
    time_allowances,
    original_id: originalId,
  };
}
