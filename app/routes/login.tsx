import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData } from "react-router";
import { login } from "../shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  return login(request);
}

export async function action({ request }: ActionFunctionArgs) {
  return login(request);
}

export default function Login() {
  const errors = useActionData<typeof action>();
  const [shop, setShop] = useState("");
  return <main className="login-shell">
    <div className="login-card">
      <a href="/" className="brand login-brand"><span className="login-mark">K</span><span>KERNIQ</span></a>
      <p className="eyebrow">MERCHANT ACCESS</p>
      <h1>Connect your store.</h1>
      <p className="muted">Enter your Shopify store domain to continue to the secure installation and sign-in flow.</p>
      <Form method="post" className="login-form">
        <label htmlFor="shop">Shopify store domain</label>
        <input id="shop" name="shop" value={shop} onChange={(event) => setShop(event.target.value)} placeholder="your-store.myshopify.com" autoComplete="url" required />
        {errors?.shop ? <p className="form-error">{errors.shop}</p> : null}
        <button className="button button-primary" type="submit">Continue to Shopify</button>
      </Form>
      <a href="/" className="text-link">← Back to KERNIQ</a>
    </div>
  </main>;
}
