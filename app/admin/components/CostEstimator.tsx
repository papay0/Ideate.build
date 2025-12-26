"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Calculator, Users, DollarSign, TrendingUp, Info } from "lucide-react";
import { PLANS, ESTIMATED_COSTS, MESSAGE_PACK } from "@/lib/constants/plans";

interface CostEstimatorProps {
  actualAvgCostFlash?: number;
  actualAvgCostPro?: number;
}

export function CostEstimator({
  actualAvgCostFlash = ESTIMATED_COSTS.flash.avgCostPerMessage,
  actualAvgCostPro = ESTIMATED_COSTS.pro.avgCostPerMessage,
}: CostEstimatorProps) {
  // Inputs
  const [totalUsers, setTotalUsers] = useState(1000);
  const [freeUserPercent, setFreeUserPercent] = useState(80);
  const [avgMessagesPerFreeUser, setAvgMessagesPerFreeUser] = useState(1.5);
  const [avgMessagesPerProUser, setAvgMessagesPerProUser] = useState(30);
  const [proModelUsagePercent, setProModelUsagePercent] = useState(30);

  // Calculations
  const calculations = useMemo(() => {
    const freeUsers = Math.round(totalUsers * (freeUserPercent / 100));
    const proUsers = totalUsers - freeUsers;

    // Free tier costs (Flash only)
    const freeMessages = freeUsers * avgMessagesPerFreeUser;
    const freeCost = freeMessages * actualAvgCostFlash;

    // Pro tier costs (mixed Flash + Pro)
    const proMessages = proUsers * avgMessagesPerProUser;
    const proFlashMessages = proMessages * (1 - proModelUsagePercent / 100);
    const proProMessages = proMessages * (proModelUsagePercent / 100);
    const proCost =
      proFlashMessages * actualAvgCostFlash + proProMessages * actualAvgCostPro;

    // Revenue
    const monthlyRevenue = proUsers * PLANS.pro.price;
    const annualRevenue = monthlyRevenue * 12;

    // Total costs
    const totalMonthlyCost = freeCost + proCost;
    const totalAnnualCost = totalMonthlyCost * 12;

    // Margins
    const grossProfit = monthlyRevenue - totalMonthlyCost;
    const grossMargin = monthlyRevenue > 0 ? (grossProfit / monthlyRevenue) * 100 : 0;

    // Break-even analysis
    const costPerProUser = proUsers > 0 ? proCost / proUsers : 0;
    const breakEvenPrice = costPerProUser + freeCost / Math.max(1, proUsers);

    return {
      freeUsers,
      proUsers,
      freeMessages,
      proMessages,
      freeCost,
      proCost,
      totalMonthlyCost,
      totalAnnualCost,
      monthlyRevenue,
      annualRevenue,
      grossProfit,
      grossMargin,
      breakEvenPrice,
      costPerFreeUser: freeUsers > 0 ? freeCost / freeUsers : 0,
      costPerProUser,
    };
  }, [
    totalUsers,
    freeUserPercent,
    avgMessagesPerFreeUser,
    avgMessagesPerProUser,
    proModelUsagePercent,
    actualAvgCostFlash,
    actualAvgCostPro,
  ]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-[#E8E4E0] overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#E8E4E0] bg-[#F5F2EF]">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-[#B8956F]" />
          <h2 className="font-semibold text-[#1A1A1A]">Cost Estimation Calculator</h2>
        </div>
        <p className="text-sm text-[#6B6B6B] mt-1">
          Project costs and revenue based on user growth
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Input Sliders */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Total Users */}
          <div>
            <label className="flex items-center justify-between text-sm font-medium text-[#1A1A1A] mb-2">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                Total Users
              </span>
              <span className="text-[#B8956F] font-bold">
                {totalUsers.toLocaleString()}
              </span>
            </label>
            <input
              type="range"
              min={100}
              max={100000}
              step={100}
              value={totalUsers}
              onChange={(e) => setTotalUsers(Number(e.target.value))}
              className="w-full h-2 bg-[#E8E4DF] rounded-lg appearance-none cursor-pointer accent-[#B8956F]"
            />
            <div className="flex justify-between text-xs text-[#9A9A9A] mt-1">
              <span>100</span>
              <span>100,000</span>
            </div>
          </div>

          {/* Free User % */}
          <div>
            <label className="flex items-center justify-between text-sm font-medium text-[#1A1A1A] mb-2">
              <span>Free Users %</span>
              <span className="text-[#B8956F] font-bold">{freeUserPercent}%</span>
            </label>
            <input
              type="range"
              min={50}
              max={99}
              value={freeUserPercent}
              onChange={(e) => setFreeUserPercent(Number(e.target.value))}
              className="w-full h-2 bg-[#E8E4DF] rounded-lg appearance-none cursor-pointer accent-[#B8956F]"
            />
            <div className="flex justify-between text-xs text-[#9A9A9A] mt-1">
              <span>50%</span>
              <span>99%</span>
            </div>
          </div>

          {/* Avg Messages Free */}
          <div>
            <label className="flex items-center justify-between text-sm font-medium text-[#1A1A1A] mb-2">
              <span>Avg Msgs/Free User</span>
              <span className="text-[#B8956F] font-bold">{avgMessagesPerFreeUser}</span>
            </label>
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.1}
              value={avgMessagesPerFreeUser}
              onChange={(e) => setAvgMessagesPerFreeUser(Number(e.target.value))}
              className="w-full h-2 bg-[#E8E4DF] rounded-lg appearance-none cursor-pointer accent-[#B8956F]"
            />
            <div className="flex justify-between text-xs text-[#9A9A9A] mt-1">
              <span>0.5</span>
              <span>2 (max {PLANS.free.messagesPerMonth})</span>
            </div>
          </div>

          {/* Avg Messages Pro */}
          <div>
            <label className="flex items-center justify-between text-sm font-medium text-[#1A1A1A] mb-2">
              <span>Avg Msgs/Pro User</span>
              <span className="text-[#B8956F] font-bold">{avgMessagesPerProUser}</span>
            </label>
            <input
              type="range"
              min={10}
              max={50}
              value={avgMessagesPerProUser}
              onChange={(e) => setAvgMessagesPerProUser(Number(e.target.value))}
              className="w-full h-2 bg-[#E8E4DF] rounded-lg appearance-none cursor-pointer accent-[#B8956F]"
            />
            <div className="flex justify-between text-xs text-[#9A9A9A] mt-1">
              <span>10</span>
              <span>50 (max {PLANS.pro.messagesPerMonth})</span>
            </div>
          </div>

          {/* Pro Model Usage % */}
          <div className="md:col-span-2">
            <label className="flex items-center justify-between text-sm font-medium text-[#1A1A1A] mb-2">
              <span>Pro Model Usage (vs Flash)</span>
              <span className="text-[#B8956F] font-bold">{proModelUsagePercent}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={proModelUsagePercent}
              onChange={(e) => setProModelUsagePercent(Number(e.target.value))}
              className="w-full h-2 bg-[#E8E4DF] rounded-lg appearance-none cursor-pointer accent-[#B8956F]"
            />
            <div className="flex justify-between text-xs text-[#9A9A9A] mt-1">
              <span>0% (all Flash)</span>
              <span>100% (all Pro)</span>
            </div>
          </div>
        </div>

        {/* Results Grid */}
        <div className="grid md:grid-cols-3 gap-4 pt-4 border-t border-[#E8E4DF]">
          {/* Monthly Cost */}
          <div className="bg-red-50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-red-600 text-sm font-medium mb-1">
              <DollarSign className="w-4 h-4" />
              Monthly Cost
            </div>
            <div className="text-2xl font-bold text-red-700">
              ${calculations.totalMonthlyCost.toFixed(2)}
            </div>
            <div className="text-xs text-red-600 mt-1">
              Free: ${calculations.freeCost.toFixed(2)} | Pro: ${calculations.proCost.toFixed(2)}
            </div>
          </div>

          {/* Monthly Revenue */}
          <div className="bg-green-50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-green-600 text-sm font-medium mb-1">
              <TrendingUp className="w-4 h-4" />
              Monthly Revenue
            </div>
            <div className="text-2xl font-bold text-green-700">
              ${calculations.monthlyRevenue.toFixed(2)}
            </div>
            <div className="text-xs text-green-600 mt-1">
              {calculations.proUsers.toLocaleString()} Pro users × ${PLANS.pro.price}
            </div>
          </div>

          {/* Gross Margin */}
          <div
            className={`rounded-xl p-4 ${
              calculations.grossMargin >= 50
                ? "bg-green-50"
                : calculations.grossMargin >= 0
                ? "bg-amber-50"
                : "bg-red-50"
            }`}
          >
            <div
              className={`flex items-center gap-2 text-sm font-medium mb-1 ${
                calculations.grossMargin >= 50
                  ? "text-green-600"
                  : calculations.grossMargin >= 0
                  ? "text-amber-600"
                  : "text-red-600"
              }`}
            >
              <Calculator className="w-4 h-4" />
              Gross Margin
            </div>
            <div
              className={`text-2xl font-bold ${
                calculations.grossMargin >= 50
                  ? "text-green-700"
                  : calculations.grossMargin >= 0
                  ? "text-amber-700"
                  : "text-red-700"
              }`}
            >
              {calculations.grossMargin.toFixed(1)}%
            </div>
            <div
              className={`text-xs mt-1 ${
                calculations.grossMargin >= 50
                  ? "text-green-600"
                  : calculations.grossMargin >= 0
                  ? "text-amber-600"
                  : "text-red-600"
              }`}
            >
              Profit: ${calculations.grossProfit.toFixed(2)}/mo
            </div>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="grid md:grid-cols-4 gap-4">
          <div className="bg-[#F5F2EF] rounded-lg p-3">
            <div className="text-xs text-[#6B6B6B] mb-1">Cost/Free User</div>
            <div className="font-bold text-[#1A1A1A]">
              ${calculations.costPerFreeUser.toFixed(3)}
            </div>
          </div>
          <div className="bg-[#F5F2EF] rounded-lg p-3">
            <div className="text-xs text-[#6B6B6B] mb-1">Cost/Pro User</div>
            <div className="font-bold text-[#1A1A1A]">
              ${calculations.costPerProUser.toFixed(2)}
            </div>
          </div>
          <div className="bg-[#F5F2EF] rounded-lg p-3">
            <div className="text-xs text-[#6B6B6B] mb-1">Annual Cost</div>
            <div className="font-bold text-[#1A1A1A]">
              ${calculations.totalAnnualCost.toFixed(0)}
            </div>
          </div>
          <div className="bg-[#F5F2EF] rounded-lg p-3">
            <div className="text-xs text-[#6B6B6B] mb-1">Annual Revenue</div>
            <div className="font-bold text-[#1A1A1A]">
              ${calculations.annualRevenue.toFixed(0)}
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl text-sm">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-blue-700">
            <p className="font-medium mb-1">Model Costs Used:</p>
            <p>
              Flash: ${actualAvgCostFlash.toFixed(4)}/msg | Pro: ${actualAvgCostPro.toFixed(4)}/msg
            </p>
            <p className="mt-1 text-blue-600">
              Based on actual usage data from your platform.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
