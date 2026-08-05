import React from "react";
import toTrendingNowItems from "../../lib/trendingNow";

const fallbackThumbnail = "/static/assets/spotlight-img.jpg";

const TrendingNow = ({
  featuredVideos,
  newestVideos,
  maxItems,
  loading,
  error,
  title = "Trending Now"
}) => {
  const items = toTrendingNowItems(featuredVideos, newestVideos, maxItems);

  return (
    <section className="trending-now" aria-labelledby="trending-now-title">
      <div className="title">
        <b id="trending-now-title">{title}</b>
      </div>
      {loading && <p className="status">Loading trending stories…</p>}
      {!loading && error && (
        <p className="status" role="alert">
          Trending stories are unavailable right now.
        </p>
      )}
      {!loading && !error && items.length === 0 && (
        <p className="status">No trending stories are available yet.</p>
      )}
      {!loading && !error && items.length > 0 && (
        <ul className="trending-list">
          {items.map(item => (
            <li key={item.id}>
              <a href={item.href}>
                <img
                  src={item.image || fallbackThumbnail}
                  alt=""
                  loading="lazy"
                  aria-hidden="true"
                />
                <span>{item.title}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default TrendingNow;
