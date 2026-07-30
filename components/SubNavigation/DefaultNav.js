import React from "react";
import Link from "next/link";
import { getHref } from "../../lib/getFunctions";
import { cleanUrl } from "../../lib/updateFunctions";

export default ({ title, link }) => {
  const url = cleanUrl(link);

  return (
    <section className="sub-navigation">
      <div className="row heading">
        <div className="pull-left">
          <h2>
            <Link as={url} href={getHref(url)} legacyBehavior>
              <a>
                <div dangerouslySetInnerHTML={{ __html: title }} />
              </a>
            </Link>
          </h2>
        </div>
      </div>
    </section>
  );
};
