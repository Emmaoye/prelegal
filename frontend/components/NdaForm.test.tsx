import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NdaForm from "./NdaForm";
import { emptyNdaFormData, NdaFormData } from "@/lib/types";

// NdaForm is a controlled component: it only reflects what its `value` prop
// says. Typing into it while feeding back the onChange calls, the way the
// real Home page does, requires a small stateful wrapper - otherwise every
// keystroke gets reset back to the original static value.
function ControlledNdaForm({
  initialValue = emptyNdaFormData,
  onChange,
}: {
  initialValue?: NdaFormData;
  onChange?: (value: NdaFormData) => void;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <NdaForm
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

describe("NdaForm", () => {
  it("renders a labeled field for every piece of NDA data", () => {
    render(<NdaForm value={emptyNdaFormData} onChange={vi.fn()} />);

    expect(screen.getAllByLabelText("Legal name")).toHaveLength(2);
    expect(screen.getAllByLabelText("Address")).toHaveLength(2);
    expect(screen.getByLabelText("Effective date")).toBeInTheDocument();
    expect(screen.getByLabelText("Purpose of disclosure")).toBeInTheDocument();
    expect(screen.getByLabelText("Term (years)")).toBeInTheDocument();
    expect(screen.getByLabelText("Governing state")).toBeInTheDocument();
  });

  it("calls onChange with the updated Party A name, leaving the rest untouched", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlledNdaForm onChange={onChange} />);

    const [partyAName] = screen.getAllByLabelText("Legal name");
    await user.type(partyAName, "Acme");

    const lastCall = onChange.mock.calls.at(-1)![0] as NdaFormData;
    expect(lastCall.partyA.name).toBe("Acme");
    expect(lastCall.partyB).toEqual(emptyNdaFormData.partyB);
    expect(lastCall.termYears).toBe(emptyNdaFormData.termYears);
  });

  it("updates Party B address independently of Party A address", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const initialValue = {
      ...emptyNdaFormData,
      partyA: { ...emptyNdaFormData.partyA, address: "500 Market St" },
    };
    render(<ControlledNdaForm initialValue={initialValue} onChange={onChange} />);

    const [, partyBAddress] = screen.getAllByLabelText("Address");
    await user.type(partyBAddress, "200 Elm Ave");

    const lastCall = onChange.mock.calls.at(-1)![0] as NdaFormData;
    expect(lastCall.partyA.address).toBe("500 Market St");
    expect(lastCall.partyB.address).toBe("200 Elm Ave");
  });

  it("updates the term years field as a plain string", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlledNdaForm onChange={onChange} />);

    const termInput = screen.getByLabelText("Term (years)");
    await user.clear(termInput);
    await user.type(termInput, "7");

    const lastCall = onChange.mock.calls.at(-1)![0] as NdaFormData;
    expect(lastCall.termYears).toBe("7");
  });

  it("does not let typing into Party B mutate the Party A object", async () => {
    const user = userEvent.setup();
    const initialValue = {
      ...emptyNdaFormData,
      partyA: { name: "Acme", address: "500 Market St" },
    };
    let latest: NdaFormData = initialValue;
    render(
      <ControlledNdaForm
        initialValue={initialValue}
        onChange={(next) => {
          latest = next;
        }}
      />
    );

    const [, partyBName] = screen.getAllByLabelText("Legal name");
    await user.type(partyBName, "Beta");

    expect(latest.partyA).toEqual({ name: "Acme", address: "500 Market St" });
    expect(latest.partyB.name).toBe("Beta");
  });
});
