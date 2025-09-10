export function buildWaLink(opts: {
  phoneE164?: string; // e.g., "5212291234567"
  message: string;
}) {
  const phone = opts.phoneE164?.replace(/\D/g, "");
  const text = encodeURIComponent(opts.message);
  return phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
}
