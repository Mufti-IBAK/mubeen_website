"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function BulkVerifyButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const runBulkVerify = async () => {
    if (!confirm("This will verify all unpaid enrollments with transaction references. Continue?")) {
      return;
    }

    setLoading(true);
    setResult(null);
    
    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("❌ Error: Not authenticated. Please log in.");
        setLoading(false);
        return;
      }

      const res = await fetch('/api/admin/payments/bulk-verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      
      const json = await res.json();
      
      if (json.ok) {
        setResult(json.summary);
        alert(`✅ Bulk Verification Complete!\n\nVerified: ${json.summary.verified}\nFailed: ${json.summary.failed}`);
      } else {
        alert(`❌ Error: ${json.error || "Bulk verification failed"}`);
      }
    } catch (e: any) {
      alert(`❌ Error: ${e.message || "Connection failed"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Bulk Payment Verification</h2>
        <p className="text-sm text-gray-600 mb-4">
          This will verify all unpaid enrollments that have a transaction reference with Flutterwave.
        </p>
        
        <button
          onClick={runBulkVerify}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Verifying..." : "Run Bulk Verification"}
        </button>

        {result && (
          <div className="mt-4 p-4 bg-gray-50 rounded border">
            <h3 className="font-bold mb-2">Summary:</h3>
            <ul className="space-y-1 text-sm">
              <li>Total Processed: <span className="font-semibold">{result.total_processed}</span></li>
              <li className="text-green-600">✅ Verified: <span className="font-semibold">{result.verified}</span></li>
              <li className="text-red-600">❌ Failed: <span className="font-semibold">{result.failed}</span></li>
            </ul>
          </div>
        )}
      </div>

      {/* Verified Enrollments Table */}
      {result && result.verified_enrollments && result.verified_enrollments.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 bg-green-50 border-b">
            <h3 className="text-lg font-bold text-green-800">
              ✅ Verified Enrollments ({result.verified_enrollments.length})
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Program
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transaction
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {result.verified_enrollments.map((enrollment: any) => (
                  <tr key={enrollment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{enrollment.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{enrollment.user_name}</div>
                      <div className="text-sm text-gray-500">{enrollment.user_email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {enrollment.program_title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {enrollment.currency} {enrollment.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{enrollment.bank}</div>
                      <div className="text-xs text-gray-500">{enrollment.originator}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs font-mono text-gray-600">{enrollment.tx_ref}</div>
                      <div className="text-xs font-mono text-gray-400">{enrollment.flw_ref}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Errors Table */}
      {result && result.errors && result.errors.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 bg-red-50 border-b">
            <h3 className="text-lg font-bold text-red-800">
              ❌ Errors ({result.errors.length})
            </h3>
          </div>
          
          <div className="p-4">
            <ul className="space-y-2">
              {result.errors.map((err: any, i: number) => (
                <li key={i} className="p-3 bg-red-50 rounded text-sm">
                  <span className="font-semibold">Enrollment #{err.id}:</span> {err.error}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
