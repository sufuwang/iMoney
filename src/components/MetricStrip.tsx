interface MetricItem {
  label: string;
  value: string;
  tone?: 'income' | 'expense';
}

interface Props {
  items: MetricItem[];
  uniformSize?: boolean;
}

const sizeFor = (text: string) => {
  if (text.length <= 9) return 16;
  if (text.length <= 11) return 14;
  if (text.length <= 13) return 12;
  return 11;
};

export default function MetricStrip({ items, uniformSize = false }: Props) {
  const sharedSize = uniformSize && items.length > 0 ? sizeFor(items[0].value) : null;
  return (
    <div className="metric-strip">
      {items.map((item) => (
        <div key={item.label} className="metric-cell">
          <span className="metric-label">{item.label}</span>
          <strong
            className={`metric-value${item.tone ? ` ${item.tone}` : ''}`}
            style={{ fontSize: sharedSize ?? sizeFor(item.value) }}
            title={item.value}
          >
            {item.value}
          </strong>
        </div>
      ))}
    </div>
  );
}
