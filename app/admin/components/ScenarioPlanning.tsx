"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Calendar, Target, DollarSign } from "lucide-react";
import { PLANS, ESTIMATED_COSTS } from "@/lib/constants/plans";

interface ScenarioPlanningProps {
  currentUsers: number;
  currentProUsers: number;
  avgCostFlash?: number;
  avgCostPro?: number;
}

export function ScenarioPlanning({
  currentUsers = 100,
  currentProUsers = 10,
  avgCostFlash = ESTIMATED_COSTS.flash.avgCostPerMessage,
  avgCostPro = ESTIMATED_COSTS.pro.avgCostPerMessage,
}: ScenarioPlanningProps) {
  const [monthlyGrowthRate, setMonthlyGrowthRate] = useState(10);
  const [conversionRate, setConversionRate] = useState(5);
  const [churnRate, setChurnRate] = useState(3);

  const projections = useMemo(() => {
    const months = [3, 6, 12];
    return months.map((month) => {
      // Simple compound growth
      let users = currentUsers;
      let proUsers = currentProUsers;

      for (let i = 0; i < month; i++) {
        // New users from growth
        const newUsers = Math.round(users * (monthlyGrowthRate / 100));
        users += newUsers;

        // Conversions to Pro
        const freeUsers = users - proUsers;
        const conversions = Math.round(freeUsers * (conversionRate / 100));
        proUsers += conversions;

        // Churn (Pro users leaving)
        const churned = Math.round(proUsers * (churnRate / 100));
        proUsers = Math.max(0, proUsers - churned);
      }

      const freeUsers = users - proUsers;

      // Cost calculations
      const freeCost = freeUsers * 1.5 * avgCostFlash; // Avg 1.5 msgs/free user
      const proCost = proUsers * 30 * (0.7 * avgCostFlash + 0.3 * avgCostPro); // Avg 30 msgs, 70% Flash
      const totalCost = freeCost + proCost;

      // Revenue
      const revenue = proUsers * PLANS.pro.price;
      const profit = revenue - totalCost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      return {
        month,
        users: Math.round(users),
        proUsers: Math.round(proUsers),
        freeUsers: Math.round(freeUsers),
        revenue: Math.round(revenue),
        cost: Math.round(totalCost),
        profit: Math.round(profit),
        margin: Math.round(margin),
      };
    });
  }, [currentUsers, currentProUsers, monthlyGrowthRate, conversionRate, churnRate, avgCostFlash, avgCostPro]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-[#E8E4E0] overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#E8E4E0] bg-[#F5F2EF]">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#B8956F]" />
          <h2 className="font-semibold text-[#1A1A1A]">Scenario Planning</h2>
        </div>
        <p className="text-sm text-[#6B6B6B] mt-1">
          Project revenue and costs over time
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Input Controls */}
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="flex items-center justify-between text-sm font-medium text-[#1A1A1A] mb-2">
              <span>Monthly Growth</span>
              <span className="text-[#B8956F] font-bold">{monthlyGrowthRate}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={50}
              value={monthlyGrowthRate}
              onChange={(e) => setMonthlyGrowthRate(Number(e.target.value))}
              className="w-full h-2 bg-[#E8E4DF] rounded-lg appearance-none cursor-pointer accent-[#B8956F]"
            />
          </div>

          <div>
            <label className="flex items-center justify-between text-sm font-medium text-[#1A1A1A] mb-2">
              <span>Conversion Rate</span>
              <span className="text-[#B8956F] font-bold">{conversionRate}%</span>
            </label>
            <input
              type="range"
              min={1}
              max={20}
              value={conversionRate}
              onChange={(e) => setConversionRate(Number(e.target.value))}
              className="w-full h-2 bg-[#E8E4DF] rounded-lg appearance-none cursor-pointer accent-[#B8956F]"
            />
          </div>

          <div>
            <label className="flex items-center justify-between text-sm font-medium text-[#1A1A1A] mb-2">
              <span>Monthly Churn</span>
              <span className="text-[#B8956F] font-bold">{churnRate}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={15}
              value={churnRate}
              onChange={(e) => setChurnRate(Number(e.target.value))}
              className="w-full h-2 bg-[#E8E4DF] rounded-lg appearance-none cursor-pointer accent-[#B8956F]"
            />
          </div>
        </div>

        {/* Projection Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          {projections.map((proj) => (
            <div
              key={proj.month}
              className="rounded-xl border border-[#E8E4E0] overflow-hidden"
            >
              <div className="px-4 py-2 bg-[#F5F2EF] border-b border-[#E8E4E0]">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#6B6B6B]" />
                  <span className="font-medium text-[#1A1A1A]">
                    {proj.month} Month{proj.month > 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#6B6B6B]">Total Users</span>
                  <span className="font-bold text-[#1A1A1A]">
                    {proj.users.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#6B6B6B]">Pro Users</span>
                  <span className="font-bold text-amber-600">
                    {proj.proUsers.toLocaleString()}
                  </span>
                </div>

                <div className="border-t border-[#E8E4DF] pt-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-[#6B6B6B]">Revenue</span>
                    <span className="font-bold text-green-600">
                      ${proj.revenue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-[#6B6B6B]">Cost</span>
                    <span className="font-bold text-red-600">
                      ${proj.cost.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#6B6B6B]">Profit</span>
                    <span
                      className={`font-bold ${
                        proj.profit >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      ${proj.profit.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div
                  className={`text-center py-2 rounded-lg ${
                    proj.margin >= 50
                      ? "bg-green-100 text-green-700"
                      : proj.margin >= 0
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  <span className="text-sm font-medium">
                    {proj.margin}% margin
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Starting Point */}
        <div className="flex items-center gap-4 p-4 bg-[#F5F2EF] rounded-xl text-sm">
          <Target className="w-5 h-5 text-[#B8956F]" />
          <div>
            <span className="text-[#6B6B6B]">Starting from: </span>
            <span className="font-medium text-[#1A1A1A]">
              {currentUsers} users ({currentProUsers} Pro)
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
