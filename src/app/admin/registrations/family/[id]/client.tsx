"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { FiUsers, FiUser, FiArrowLeft, FiMail, FiPhone } from "react-icons/fi";

interface Enrollment {
  id: number;
  user_id: string;
  program_id: number;
  status: string | null;
  payment_status: string | null;
  amount: number | null;
  currency: string | null;
  transaction_id: string | null;
  form_data: Record<string, unknown> | null;
  classroom_link: string | null;
  defer_active?: boolean | null;
  completed_at?: string | null;
  created_at: string;
  is_family?: boolean | null;
  family_size?: number | null;
  registration_type?: "individual" | "family_head" | "family_member";
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone?: string | null;
}

interface Program {
  id: number;
  title: string;
}

export default function FamilyDetailClient({
  familyHeadId,
}: {
  familyHeadId: string;
}) {
  const [familyHead, setFamilyHead] = useState<Enrollment | null>(null);
  const [familyMembers, setFamilyMembers] = useState<Enrollment[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFamilyData();
  }, [familyHeadId]);

  const loadFamilyData = React.useCallback(async () => {
    setLoading(true);
    try {
      // Load family head enrollment
      const { data: headData } = await supabase
        .from("enrollments")
        .select("*")
        .eq("id", parseInt(familyHeadId))
        .single();

      if (!headData) {
        console.error("Family head not found");
        return;
      }

      setFamilyHead(headData as Enrollment);

      // Load program details
      const { data: programData } = await supabase
        .from("programs")
        .select("id, title")
        .eq("id", headData.program_id)
        .single();

      setProgram(programData as Program);

      // Find all family members (same user_id and program_id, different registration types)
      const { data: membersData } = await supabase
        .from("enrollments")
        .select("*")
        .eq("user_id", headData.user_id)
        .eq("program_id", headData.program_id)
        .eq("is_family", true)
        .order("created_at", { ascending: true });

      setFamilyMembers((membersData as Enrollment[]) || []);

      // Load profiles for all family members
      const allUserIds = [headData.user_id];
      const uniqueUserIds = Array.from(new Set(allUserIds));

      if (uniqueUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone")
          .in("id", uniqueUserIds);

        const profilesMap: Record<string, Profile> = {};
        ((profilesData as Profile[]) || []).forEach((profile) => {
          profilesMap[profile.id] = profile;
        });
        setProfiles(profilesMap);
      }
    } catch (error) {
      console.error("Error loading family data:", error);
    } finally {
      setLoading(false);
    }
  }, [familyHeadId]);

  useEffect(() => {
    loadFamilyData();
  }, [loadFamilyData]);

  const updatePaymentStatus = async (enrollmentId: number, status: string) => {
    try {
      await supabase
        .from("enrollments")
        .update({ payment_status: status })
        .eq("id", enrollmentId);

      // Update local state
      if (familyHead?.id === enrollmentId) {
        setFamilyHead((prev) =>
          prev ? { ...prev, payment_status: status } : null
        );
      }
      setFamilyMembers((prev) =>
        prev.map((member) =>
          member.id === enrollmentId
            ? { ...member, payment_status: status }
            : member
        )
      );
    } catch (error) {
      console.error("Error updating payment status:", error);
    }
  };

  const formatFormData = (formData: Record<string, unknown> | null) => {
    if (!formData) return null;

    const getDisplayValue = (key: string, value: any): string => {
      if (value === null || value === undefined) return "Not provided";
      if (typeof value === "boolean") return value ? "Yes" : "No";
      if (Array.isArray(value)) return value.join(", ");
      if (typeof value === "object") return JSON.stringify(value, null, 2);
      return String(value);
    };

    return Object.entries(formData)
      .filter(
        ([key, value]) =>
          !key.includes("section") && value !== "" && value !== null
      )
      .map(([key, value]) => ({
        label: key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        value: getDisplayValue(key, value),
      }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/registrations" className="btn-outline">
            <FiArrowLeft className="w-4 h-4" />
            Back to Registrations
          </Link>
          <div className="animate-pulse">
            <div className="w-48 h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
        <div className="py-12 text-center">
          <div className="w-8 h-8 mx-auto mb-4 border-b-2 border-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading family details...</p>
        </div>
      </div>
    );
  }

  if (!familyHead) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/registrations" className="btn-outline">
            <FiArrowLeft className="w-4 h-4" />
            Back to Registrations
          </Link>
          <h1 className="text-2xl font-bold text-red-600">Family Not Found</h1>
        </div>
        <div className="py-12 text-center">
          <p className="text-gray-600">
            The requested family registration could not be found.
          </p>
        </div>
      </div>
    );
  }

  const familyHeadProfile = profiles[familyHead.user_id];
  const allMembers = familyMembers.filter(
    (member) => member.registration_type !== "family_head"
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/registrations"
            className="flex items-center gap-2 btn-outline"
          >
            <FiArrowLeft className="w-4 h-4" />
            Back to Registrations
          </Link>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
              <FiUsers className="w-6 h-6 text-blue-600" />
              Family Registration Details
            </h1>
            <p className="text-muted-foreground">
              {program?.title || "Unknown Program"}
            </p>
          </div>
        </div>
      </div>

      {/* Family Head Card */}
      <div className="p-6 border border-blue-200 bg-blue-50 rounded-xl">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 text-white bg-blue-600 rounded-lg">
              <FiUsers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-blue-900">Family Head</h2>
              <p className="text-blue-700">
                Payment responsible & primary contact
              </p>
            </div>
          </div>
          <span
            className={`badge ${
              familyHead.payment_status === "paid"
                ? "bg-green-100 text-green-700"
                : familyHead.payment_status === "refunded"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {familyHead.payment_status || "pending"}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {familyHeadProfile?.full_name || "Unknown User"}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-gray-600">
              <FiMail className="w-4 h-4" />
              <span>{familyHeadProfile?.email || "No email"}</span>
            </div>
            {familyHeadProfile?.phone && (
              <div className="flex items-center gap-2 mt-1 text-gray-600">
                <FiPhone className="w-4 h-4" />
                <span>{familyHeadProfile.phone}</span>
              </div>
            )}
          </div>
          <div className="text-sm text-gray-600">
            <p>
              <span className="font-medium text-gray-900">Registered:</span>{" "}
              {new Date(familyHead.created_at).toLocaleString()}
            </p>
            <p>
              <span className="font-medium text-gray-900">Family Size:</span>{" "}
              {familyHead.family_size || "Unknown"} members
            </p>
            <p>
              <span className="font-medium text-gray-900">Total Amount:</span>{" "}
              {familyHead.currency || "NGN"}{" "}
              {familyHead.amount?.toLocaleString() || "-"}
            </p>
            {familyHead.transaction_id && (
              <p>
                <span className="font-medium text-gray-900">
                  Transaction ID:
                </span>{" "}
                {familyHead.transaction_id}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() =>
              updatePaymentStatus(
                familyHead.id,
                familyHead.payment_status === "paid" ? "pending" : "paid"
              )
            }
            className="btn-outline"
          >
            {familyHead.payment_status === "paid" ? "Mark Unpaid" : "Mark Paid"}
          </button>
          {familyHead.payment_status === "paid" && (
            <button
              onClick={() => updatePaymentStatus(familyHead.id, "refunded")}
              className="text-yellow-600 border-yellow-600 btn-outline"
            >
              Process Refund
            </button>
          )}
        </div>

        {/* Family Head Form Data */}
        {familyHead.form_data && (
          <details className="mt-4">
            <summary className="mb-2 text-sm font-medium text-blue-900 cursor-pointer">
              View Family Head Information
            </summary>
            <div className="grid grid-cols-1 gap-4 p-4 bg-white rounded-lg md:grid-cols-2">
              {formatFormData(familyHead.form_data)?.map(
                ({ label, value }, index) => (
                  <div key={index} className="pl-3 border-l-2 border-blue-200">
                    <dt className="text-xs font-medium text-gray-500 uppercase">
                      {label}
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">{value}</dd>
                  </div>
                )
              )}
            </div>
          </details>
        )}
      </div>

      {/* Family Members */}
      <div>
        <h2 className="flex items-center gap-2 mb-4 text-xl font-bold">
          <FiUser className="w-5 h-5" />
          Family Members ({allMembers.length})
        </h2>

        {allMembers.length === 0 ? (
          <div className="p-8 text-center rounded-lg bg-gray-50">
            <p className="text-gray-600">
              No individual family member registrations found.
            </p>
            <p className="mt-1 text-sm text-gray-500">
              This may be a family registration that only collected the family
              head information.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {allMembers.map((member, index) => {
              // const memberProfile = profiles[member.user_id]; // Unused variable
              return (
                <div
                  key={member.id}
                  className="p-4 bg-white border border-gray-200 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-gray-100 rounded">
                        <FiUser className="w-4 h-4 text-gray-600" />
                      </div>
                      <h3 className="font-semibold">Member {index + 1}</h3>
                    </div>
                    <span className="px-2 py-1 text-xs text-blue-700 bg-blue-100 rounded">
                      {member.registration_type?.replace("_", " ")}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="font-medium">Status:</span> Covered by
                      family payment
                    </p>
                    <p>
                      <span className="font-medium">Registered:</span>{" "}
                      {new Date(member.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {member.form_data && (
                    <details className="mt-3">
                      <summary className="text-xs font-medium text-blue-600 cursor-pointer">
                        View Details
                      </summary>
                      <div className="mt-2 space-y-2">
                        {formatFormData(member.form_data)
                          ?.slice(0, 5)
                          .map(({ label, value }, index) => (
                            <div key={index}>
                              <dt className="text-xs font-medium text-gray-500">
                                {label}
                              </dt>
                              <dd className="text-xs text-gray-900">{value}</dd>
                            </div>
                          ))}
                      </div>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Family Actions */}
      <div className="p-6 rounded-lg bg-gray-50">
        <h3 className="mb-4 font-semibold">Family Management</h3>
        <div className="flex flex-wrap gap-3">
          <button className="btn-outline">Send Family Reminder</button>
          <button className="btn-outline">Update Family Status</button>
          <button className="btn-outline">Export Family Data</button>
          <button className="btn-destructive">Remove Entire Family</button>
        </div>
      </div>
    </div>
  );
}
