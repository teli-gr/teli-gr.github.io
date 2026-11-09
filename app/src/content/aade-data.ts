/* News shown on the site, plus the date of the last official check.
   On GitHub, scripts/check-aade.mjs updates this file every Monday and Thursday. You can also edit it by hand. */
export const AADE_DATA: { checkedAt: string; notices: { date: string; title: string; url?: string; source?: string }[] } = {
  "checkedAt": "2026-11-09T16:37:18Z",
  "notices": [
    {
      "date": "2026-11-02",
      "title": "Αναρτήθηκαν τα ειδοποιητήρια των τελών κυκλοφορίας 2027 στο myCAR",
      "url": "https://www.larissanet.gr/2026/11/02/teli-kykloforias-2027-anartithikan-ta-eidopoiitiria-sto-mycar/",
      "source": "larissanet.gr"
    },
    {
      "date": "2026-11-02",
      "title": "Προθεσμία πληρωμής 31/12/2026, χωρίς παράταση. Ίδια προθεσμία για δήλωση ακινησίας.",
      "url": "https://www.financialreport.gr/teli-kykloforias-2027-poioi-plironoun-kai-posa-poies-oi-nees-prothesmies-kai-ta-prostima/",
      "source": "financialreport.gr"
    }
  ]
};
