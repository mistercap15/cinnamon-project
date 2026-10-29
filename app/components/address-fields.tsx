export function AddressFields({
  value = {},
  countries = [
    { iso_2: "us", display_name: "United States" },
    { iso_2: "gb", display_name: "United Kingdom" },
    { iso_2: "in", display_name: "India" },
    { iso_2: "lk", display_name: "Sri Lanka" },
  ],
}: {
  value?: any;
  countries?: any[];
}) {
  return (
    <div className="address-grid">
      <label>
        First name
        <input
          name="first_name"
          autoComplete="given-name"
          required
          maxLength={80}
          defaultValue={value.first_name || ""}
        />
      </label>
      <label>
        Last name
        <input
          name="last_name"
          autoComplete="family-name"
          required
          maxLength={80}
          defaultValue={value.last_name || ""}
        />
      </label>
      <label className="field-full">
        Street address
        <input
          name="address_1"
          autoComplete="address-line1"
          required
          minLength={3}
          maxLength={200}
          defaultValue={value.address_1 || ""}
        />
      </label>
      <label className="field-full">
        Apartment, suite, etc. <span>(optional)</span>
        <input
          name="address_2"
          autoComplete="address-line2"
          maxLength={200}
          defaultValue={value.address_2 || ""}
        />
      </label>
      <label>
        City
        <input
          name="city"
          autoComplete="address-level2"
          required
          maxLength={100}
          defaultValue={value.city || ""}
        />
      </label>
      <label>
        State / province <span>(optional)</span>
        <input
          name="province"
          autoComplete="address-level1"
          maxLength={100}
          defaultValue={value.province || ""}
        />
      </label>
      <label>
        Country
        <select
          name="country_code"
          autoComplete="country"
          defaultValue={value.country_code || countries[0]?.iso_2}
        >
          {countries.map((c) => (
            <option value={c.iso_2} key={c.iso_2}>
              {c.display_name || c.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Postal code
        <input
          name="postal_code"
          autoComplete="postal-code"
          required
          minLength={2}
          maxLength={20}
          defaultValue={value.postal_code || ""}
        />
      </label>
      <label className="field-full">
        Phone number
        <input
          name="phone"
          aria-label="Phone number"
          type="tel"
          autoComplete="tel"
          required
          minLength={6}
          maxLength={30}
          defaultValue={value.phone || ""}
        />
        <small>For delivery updates. Sign-in uses your email address.</small>
      </label>
    </div>
  );
}
