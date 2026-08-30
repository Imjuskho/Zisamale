import { useT } from "./LanguageContext";
import { useDistrict } from "./DistrictContext";
import type { PublicDistrict } from "../../types/public";
import { CaretDown } from "@phosphor-icons/react";

/** Native select (accessible, zero-dependency) styled as a field control.
 * Choosing a district stores it locally and turns on the barometer. */
export function DistrictSelect({
  districts,
  className = "",
}: {
  districts: PublicDistrict[];
  className?: string;
}) {
  const t = useT();
  const { district, setDistrict } = useDistrict();

  const options = [...districts].sort((a, b) =>
    a.district_name.localeCompare(b.district_name)
  );

  return (
    <label className={`relative block ${className}`}>
      <span className="mb-1 block text-label uppercase tracking-wide text-apple-muted48">
        {t("districtLabel")}
      </span>
      <span className="relative block">
        <select
          value={district?.id ?? ""}
          onChange={(e) => {
            const picked = options.find((o) => o.district_id === e.target.value);
            if (picked) setDistrict({ id: picked.district_id, name: picked.district_name });
          }}
          className="h-12 w-full appearance-none rounded-md border border-surface-border bg-white px-4 pr-10 text-[16px] font-medium text-apple-ink focus:shadow-focus"
          data-testid="district-select"
        >
          <option value="" disabled>
            {t("noDistrictYet")}
          </option>
          {options.map((o) => (
            <option key={o.district_id} value={o.district_id}>
              {o.district_name}
            </option>
          ))}
        </select>
        <CaretDown
          size={18}
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-apple-muted48"
        />
      </span>
    </label>
  );
}