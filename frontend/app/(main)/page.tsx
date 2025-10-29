"use client";

export default function Page({
    params,
    searchParams,
}: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    console.log(params);
    console.log(searchParams);
    return <h1>Dashboard</h1>;
}
