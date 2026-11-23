interface MetricItem {
  label: string;
  value: string;
  tone?: 'income' | 'expense';
}

interface Props {
  items: MetricItem[];
}

const sizeFor = (text: string) => {
  if (text.length <= 9) return 16;
  if (text.length <= 11) return 14;
  if (text.length <= 13) return 12;
  return 11;
};

export default function MetricStrip({ items }: Props) {
  return (
    <div className="metric-strip">
      {items.map((item) => (
        <div key={item.label} className="metric-cell">
          <span className="metric-label">{item.label}</span>
          <strong
            className={`metric-value${item.tone ? ` ${item.tone}` : ''}`}
            style={{ fontSize: sizeFor(item.value) }}
            title={item.value}
          >
            {item.value}
          </strong>
        </div>
      ))}
    </div>
  );
}
