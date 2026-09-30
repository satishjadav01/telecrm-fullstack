import { Chip } from "@heroui/react";
import { PhoneIncoming, PhoneOutgoing } from "lucide-react";

export function CallDirectionChip({ direction, size = "sm" }) {
  const isInbound = direction === "inbound";

  return (
    <Chip
      size={size}
      variant="flat"
      className={
        isInbound
          ? "border border-teal-200 bg-teal-50 text-teal-700"
          : "border border-blue-200 bg-blue-50 text-blue-700"
      }
      startContent={
        isInbound ? (
          <PhoneIncoming size={12} className="mr-1" />
        ) : (
          <PhoneOutgoing size={12} className="mr-1" />
        )
      }
    >
      {isInbound ? "Inbound" : "Outbound"}
    </Chip>
  );
}
