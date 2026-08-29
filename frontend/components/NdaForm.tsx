"use client";

import { NdaFormData, PartyInfo } from "@/lib/types";

interface NdaFormProps {
  value: NdaFormData;
  onChange: (value: NdaFormData) => void;
}

const labelClasses = "block text-sm font-medium text-gray-700";
const inputClasses =
  "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500";

function PartyFields({
  legend,
  party,
  onChange,
}: {
  legend: string;
  party: PartyInfo;
  onChange: (party: PartyInfo) => void;
}) {
  return (
    <fieldset className="space-y-3 rounded-lg border border-gray-200 p-4">
      <legend className="px-1 text-sm font-semibold text-gray-900">{legend}</legend>
      <label className={labelClasses}>
        Legal name
        <input
          type="text"
          required
          value={party.name}
          onChange={(e) => onChange({ ...party, name: e.target.value })}
          className={inputClasses}
          placeholder="e.g. Acme Corporation"
        />
      </label>
      <label className={labelClasses}>
        Address
        <textarea
          required
          rows={2}
          value={party.address}
          onChange={(e) => onChange({ ...party, address: e.target.value })}
          className={inputClasses}
          placeholder="e.g. 123 Main St, San Francisco, CA 94105"
        />
      </label>
    </fieldset>
  );
}

export default function NdaForm({ value, onChange }: NdaFormProps) {
  return (
    <form className="space-y-6">
      <PartyFields
        legend="Party A"
        party={value.partyA}
        onChange={(partyA) => onChange({ ...value, partyA })}
      />
      <PartyFields
        legend="Party B"
        party={value.partyB}
        onChange={(partyB) => onChange({ ...value, partyB })}
      />

      <label className={labelClasses}>
        Effective date
        <input
          type="date"
          required
          value={value.effectiveDate}
          onChange={(e) => onChange({ ...value, effectiveDate: e.target.value })}
          className={inputClasses}
        />
      </label>

      <label className={labelClasses}>
        Purpose of disclosure
        <textarea
          required
          rows={3}
          value={value.purpose}
          onChange={(e) => onChange({ ...value, purpose: e.target.value })}
          className={inputClasses}
          placeholder="e.g. evaluating a potential partnership between the Parties"
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className={labelClasses}>
          Term (years)
          <input
            type="number"
            min={1}
            required
            value={value.termYears}
            onChange={(e) => onChange({ ...value, termYears: e.target.value })}
            className={inputClasses}
          />
        </label>
        <label className={labelClasses}>
          Governing state
          <input
            type="text"
            required
            value={value.governingState}
            onChange={(e) => onChange({ ...value, governingState: e.target.value })}
            className={inputClasses}
            placeholder="e.g. Delaware"
          />
        </label>
      </div>
    </form>
  );
}
