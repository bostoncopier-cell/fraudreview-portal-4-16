type Props = {
  size?: number;
};

export default function LogoBadge({ size = 48 }: Props) {
  return (
    <img
      src="/logo-badge.png"
      alt="Fraud Review Badge"
      style={{ width: size, height: size }}
      className="rounded-2xl object-contain"
    />
  );
}