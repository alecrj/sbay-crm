"use client";
import React from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import Image from "next/image";


export default function UserMetaCard() {
  const { isOpen, openModal, closeModal } = useModal();
  const handleSave = () => {
    // Handle save logic here
    console.log("Saving changes...");
    closeModal();
  };
  return (
    <>
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
            <div className="w-20 h-20 overflow-hidden border border-gray-200 rounded-full dark:border-gray-800 bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <Image
                width={40}
                height={40}
                src="/images/logo/sbalogo.png"
                alt="SBA Logo"
              />
            </div>
            <div className="order-3 xl:order-2">
              <h4 className="mb-2 text-lg font-semibold text-center text-gray-800 dark:text-white/90 xl:text-left">
                Shallow Bay Advisors
              </h4>
              <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Commercial Real Estate
                </p>
                <div className="hidden h-3.5 w-px bg-gray-300 dark:bg-gray-700 xl:block"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  South Florida
                </p>
              </div>
            </div>
            <div className="flex items-center order-2 gap-2 grow xl:order-3 xl:justify-end">
              <a href="https://shallowbayadvisors.com" target="_blank" rel="noreferrer" className="flex h-11 w-11 items-center justify-center gap-2 rounded-full border border-gray-300 bg-white text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200">
                <svg className="fill-current" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 2.5C5.85 2.5 2.5 5.85 2.5 10C2.5 14.15 5.85 17.5 10 17.5C14.15 17.5 17.5 14.15 17.5 10C17.5 5.85 14.15 2.5 10 2.5ZM10 15.5C6.96 15.5 4.5 13.04 4.5 10C4.5 6.96 6.96 4.5 10 4.5C13.04 4.5 15.5 6.96 15.5 10C15.5 13.04 13.04 15.5 10 15.5ZM8.75 7.5H11.25C11.66 7.5 12 7.84 12 8.25C12 8.66 11.66 9 11.25 9H8.75C8.34 9 8 8.66 8 8.25C8 7.84 8.34 7.5 8.75 7.5ZM11.25 11H8.75C8.34 11 8 11.34 8 11.75C8 12.16 8.34 12.5 8.75 12.5H11.25C11.66 12.5 12 12.16 12 11.75C12 11.34 11.66 11 11.25 11Z" fill=""/>
                </svg>
              </a>
            </div>
          </div>
          <div className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 lg:inline-flex lg:w-auto">
            <svg className="fill-current" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M9 1.5C4.85775 1.5 1.5 4.85775 1.5 9C1.5 13.1423 4.85775 16.5 9 16.5C13.1423 16.5 16.5 13.1423 16.5 9C16.5 4.85775 13.1423 1.5 9 1.5ZM8.25 6C8.25 5.58579 8.58579 5.25 9 5.25C9.41421 5.25 9.75 5.58579 9.75 6V9C9.75 9.41421 9.41421 9.75 9 9.75C8.58579 9.75 8.25 9.41421 8.25 9V6ZM9 12.75C9.41421 12.75 9.75 12.4142 9.75 12C9.75 11.5858 9.41421 11.25 9 11.25C8.58579 11.25 8.25 11.5858 8.25 12C8.25 12.4142 8.58579 12.75 9 12.75Z" fill=""/>
            </svg>
            Company Profile
          </div>
        </div>
      </div>
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Edit Personal Information
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Update your details to keep your profile up-to-date.
            </p>
          </div>
          <form className="flex flex-col">
            <div className="custom-scrollbar h-[450px] overflow-y-auto px-2 pb-3">
              <div>
                <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
                  Social Links
                </h5>

                <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                  <div>
                    <Label>Website</Label>
                    <Input
                      type="text"
                      defaultValue="https://shallowbayadvisors.com"
                    />
                  </div>

                  <div>
                    <Label>Email</Label>
                    <Input type="text" defaultValue="info@shallowbayadvisors.com" />
                  </div>

                  <div>
                    <Label>Phone</Label>
                    <Input
                      type="text"
                      defaultValue="(305) 555-0123"
                    />
                  </div>

                  <div>
                    <Label>Address</Label>
                    <Input
                      type="text"
                      defaultValue="Miami, FL"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-7">
                <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
                  Personal Information
                </h5>

                <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                  <div className="col-span-2 lg:col-span-1">
                    <Label>Company Name</Label>
                    <Input type="text" defaultValue="Shallow Bay Advisors" />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Business Type</Label>
                    <Input type="text" defaultValue="Commercial Real Estate" />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Contact Email</Label>
                    <Input type="text" defaultValue="admin@shallowbayadvisors.com" />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Phone</Label>
                    <Input type="text" defaultValue="(305) 555-0123" />
                  </div>

                  <div className="col-span-2">
                    <Label>Description</Label>
                    <Input type="text" defaultValue="Professional Commercial Real Estate Services in South Florida" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button size="sm" variant="outline" onClick={closeModal}>
                Close
              </Button>
              <Button size="sm" onClick={handleSave}>
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
