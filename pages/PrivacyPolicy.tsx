import { Link } from "react-router";
import type { ReactNode } from "react";

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="mt-8">
    <h2 className="text-xl font-semibold text-zinc-900 mb-3">{title}</h2>
    <div className="space-y-3 text-sm leading-7 text-zinc-700">{children}</div>
  </section>
);

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-stone-50 px-5 py-12 md:px-10 font-poppins">
      <article className="mx-auto max-w-3xl bg-white rounded-2xl border border-stone-200 p-6 md:p-10">
        <div className="text-sm font-semibold uppercase tracking-widest text-amber-700">V1 Garments</div>
        <h1 className="mt-3 text-3xl md:text-4xl font-semibold text-zinc-900">Privacy Policy</h1>
        <p className="mt-3 text-sm text-zinc-600">Effective date: 11 November 2026</p>
        <p className="mt-6 text-sm leading-7 text-zinc-700">V1 Garments ("we", "our") operates the V1 Garments Android mobile application and website at <a className="underline" href="https://www.v1garments.com/">www.v1garments.com</a>. This policy explains how information is handled when you browse, register, shop, request support, or use our services.</p>
        <Section title="1. Information we collect">
          <p>Depending on the features you use, we may collect your name, email address, mobile number, account identifiers, delivery and billing addresses, saved addresses, shopping cart and wishlist contents, order and return details, and customer support messages.</p>
          <p>When you place an order, we handle purchase details, transaction references, payment status, refund and delivery information. Our payment providers process payment transactions. We do not need your full payment card number to fulfil a clothing order.</p>
          <p>If you use our clothing customisation features, we may receive the photos, artwork, garment preferences, and designs you choose to upload. Technical information necessary for operation and security, such as IP addresses, device or browser details, and server logs, may also be processed.</p>
        </Section>
        <Section title="2. How we use information">
          <p>We use information to register and authenticate customers, operate our website and app, show relevant products, manage carts and wishlists, process purchases and payments, fulfil and track deliveries, administer rewards, handle returns and refunds, respond to support requests, secure our services, prevent fraud and comply with legal obligations.</p>
        </Section>
        <Section title="3. Service providers and data sharing">
          <p>Information needed to deliver services may be processed by our payment processor (including Razorpay), shipment and logistics partners (including Shiprocket and assigned couriers), cloud hosting and infrastructure providers, and authorised support providers. We provide only the information reasonably needed for the relevant purpose. Providers may apply their own privacy notices where they act independently.</p>
          <p>We may disclose information if legally required, to protect users and the service, or as directed by you. We do not treat order fulfilment or payment processing as permission to use your personal information for unrelated purposes.</p>
        </Section>
        <Section title="4. Security">
          <p>We use reasonable organisational and technical measures intended to protect personal information, including encrypted connections for supported website and app traffic and restricted access to backend systems. No system can be guaranteed completely secure.</p>
        </Section>
        <Section title="5. Retention and deletion">
          <p>We retain personal information while needed to provide the services described above and for legitimate security, accounting, tax, dispute resolution, fraud prevention, and legal obligations. The retention period depends on the record and applicable requirements.</p>
          <p>Customers can request account deletion in the mobile app under Account settings → Account deletion, or from our public <Link to="/account-deletion" className="underline font-semibold">Account Deletion page</Link>. We review requests, verify ownership where necessary, remove data that no longer needs to be retained, and explain any legally necessary retention. Submitting a request does not immediately delete account information.</p>
        </Section>
        <Section title="6. Your choices">
          <p>You can review and change certain profile and delivery information in your account. You may also contact us to ask about access, correction, or deletion of your personal information, subject to applicable legal requirements.</p>
        </Section>
        <Section title="7. Updates to this policy">
          <p>We may update this policy to reflect changes in our services or legal requirements. The current version and its effective date will appear on this page.</p>
        </Section>
        <Section title="8. Contact">
          <p>V1 Garments<br />Website: <a className="underline" href="https://www.v1garments.com/">https://www.v1garments.com/</a><br />Privacy and support email: <a className="underline" href="mailto:v1garmentshelp@gmail.com">v1garmentshelp@gmail.com</a></p>
        </Section>
      </article>
    </main>
  );
}
