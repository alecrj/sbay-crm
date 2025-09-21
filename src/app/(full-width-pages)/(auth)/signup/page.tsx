import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up | Shallow Bay Advisors CRM",
  description: "Create your account for Shallow Bay Advisors Commercial Real Estate CRM",
};

export default function SignUp() {
  return <SignUpForm />;
}
