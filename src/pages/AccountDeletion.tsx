import { Link } from "react-router";

export default function AccountDeletion() {
  const subject = encodeURIComponent("V1 Garments - Account deletion request");
  const body = encodeURIComponent("Hello V1 Garments team,\n\nI would like to request deletion of my V1 Garments account and associated personal data.\n\nMy registered email address is: \n\nPlease let me know if you need to verify my account ownership.\n\nThank you.");
  return (
    <main className="min-h-screen bg-stone-50 px-5 py-12 md:px-10 font-poppins">
      <article className="mx-auto max-w-3xl bg-white rounded-2xl border border-stone-200 p-6 md:p-10">
        <div className="text-sm font-semibold uppercase tracking-widest text-amber-700">V1 Garments</div>
        <h1 className="mt-3 text-3xl md:text-4xl font-semibold text-zinc-900">Request Account Deletion</h1>
        <p className="mt-5 text-sm leading-7 text-zinc-700">This page allows V1 Garments website and Android app customers to request deletion of their account and associated personal data. You do not need to reinstall the app or sign in to send a request.</p>
        <h2 className="mt-8 text-xl font-semibold">How to request deletion</h2>
        <ol className="mt-3 list-decimal ml-5 space-y-2 text-sm leading-7 text-zinc-700">
          <li>Use the button below to email our support team from any email account.</li>
          <li>Provide the email address registered with your V1 Garments account. Do not email your password, OTP, card number, or other secrets.</li>
          <li>We may contact you to verify that you own the account.</li>
          <li>After verification, we review any open orders, refunds, disputes, and legally required records, then process your deletion request.</li>
        </ol>
        <a className="mt-7 inline-flex items-center justify-center rounded-xl bg-zinc-900 px-6 py-4 text-sm font-semibold text-white hover:bg-zinc-700" href={`mailto:v1garmentshelp@gmail.com?subject=${subject}&body=${body}`}>Email Account Deletion Request</a>
        <p className="mt-4 text-sm leading-7 text-zinc-700">If the email button does not open a mail application, open your preferred email service and write directly to <a className="underline font-semibold" href="mailto:v1garmentshelp@gmail.com">v1garmentshelp@gmail.com</a> using the subject <strong>V1 Garments - Account deletion request</strong>.</p>
        <h2 className="mt-8 text-xl font-semibold">What data is deleted or retained?</h2>
        <p className="mt-3 text-sm leading-7 text-zinc-700">After verifying the request, we delete or de-identify account and associated personal data no longer required for legitimate purposes. Some completed order, payment, refund, fraud prevention, or tax records may need to be retained where required by law or to resolve outstanding obligations. Our team should confirm the status of your request and explain any legally required retention in its response.</p>
        <p className="mt-6 text-sm leading-7 text-zinc-700">You can also request deletion from inside the Android app using <strong>Account settings → Account deletion</strong>.</p>
        <p className="mt-6 text-sm"><Link className="underline" to="/privacy-policy">Read our Privacy Policy</Link></p>
      </article>
    </main>
  );
}
