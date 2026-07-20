import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../analytics/gtag';

/**
 * Fires a GA4 page_view on client-side route changes. Renders nothing.
 *
 * The FIRST render is skipped on purpose: initAnalytics() already sent a
 * page_view for the landing URL at app start, so counting it again here would
 * double-count the entry page. Every subsequent in-app navigation is tracked.
 *
 * Must be mounted inside <BrowserRouter> so useLocation has a router context.
 */
export default function PageViewTracker() {
  const location = useLocation();
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    trackPageView(location.pathname + location.search);
  }, [location]);

  return null;
}
