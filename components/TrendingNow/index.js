import React from "react";
import toTrendingNowItems from "../../lib/trendingNow";
import "./styles.scss";

const TrendingNow = ({ spotlightPosts, loading, error }) => {
  const items = toTrendingNowItems(spotlightPosts);

  return (
    <section className="trending-now" aria-labelledby="trending-now-title">
      <div className="title">
        <b id="trending-now-title">Trending Now</b>
        <span className="staging-indicator">Staging preview</span>
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
                {item.image && (
                  <img
                    src={item.image}
                    alt=""
                    loading="lazy"
                    aria-hidden="true"
                  />
                )}
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
