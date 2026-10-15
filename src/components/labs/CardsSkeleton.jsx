/* ─── Placeholder cards shown while lab tests / packages load from the API ───
   Prevents logged-in users from briefly seeing the default (guest) list. */
export default function CardsSkeleton({ count = 4, label = "Loading..." }) {
  return (
    <div className="cards-skeleton" role="status" aria-label={label}>
      <style>{`
        .cards-skeleton {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 20px;
          padding: 8px 0;
        }
        .cards-skeleton-card {
          border: 1px solid var(--border);
          border-radius: 20px;
          overflow: hidden;
          background: #ffffff;
        }
        .cards-skeleton-block {
          background: linear-gradient(90deg, #eef4f3 25%, #f7fbfa 50%, #eef4f3 75%);
          background-size: 200% 100%;
          animation: cardsSkeletonShimmer 1.4s ease-in-out infinite;
          border-radius: 10px;
        }
        .cards-skeleton-body { padding: 18px 20px 20px; display: flex; flex-direction: column; gap: 12px; }
        @keyframes cardsSkeletonShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .cards-skeleton-block { animation: none; }
        }
      `}</style>
      {Array.from({ length: count }).map((_, i) => (
        <div className="cards-skeleton-card" key={i} aria-hidden="true">
          <div className="cards-skeleton-block" style={{ height: 150, borderRadius: 0 }} />
          <div className="cards-skeleton-body">
            <div className="cards-skeleton-block" style={{ height: 18, width: "70%" }} />
            <div className="cards-skeleton-block" style={{ height: 14, width: "45%" }} />
            <div className="cards-skeleton-block" style={{ height: 40, marginTop: 8, borderRadius: 12 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
