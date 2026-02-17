"use client";

import { motion } from "framer-motion";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1,
        }
    },
    exit: { opacity: 0, transition: { duration: 0.2 } }
};

const itemVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.95 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { type: "spring" as const, stiffness: 100, damping: 15 }
    }
};

const Shimmer = () => (
    <motion.div
        className="absolute inset-0 -translate-x-full"
        animate={{ translateX: ["-100%", "200%"] }}
        transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear",
        }}
        style={{
            background: "linear-gradient(90deg, transparent 0%, rgba(139, 92, 246, 0.1) 30%, rgba(139, 92, 246, 0.35) 50%, rgba(139, 92, 246, 0.1) 70%, transparent 100%)",
        }}
    />
);

export default function SkeletonLoader() {
    return (
        <motion.div
            className="w-full max-w-3xl flex flex-col gap-6 p-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
        >
            <motion.div variants={itemVariants} className="flex">
                <div className="relative h-8 w-32 rounded-full bg-white/5 border border-white/5 overflow-hidden">
                    <Shimmer />
                </div>
            </motion.div>

            <motion.div variants={itemVariants} className="flex">
                <div className="relative h-10 w-3/4 rounded-xl bg-white/5 border border-white/5 overflow-hidden">
                    <Shimmer />
                </div>
            </motion.div>

            <motion.div variants={itemVariants} className="flex flex-col gap-3 mt-2">
                <div className="relative h-4 w-full rounded-lg bg-white/5 border border-white/5 overflow-hidden">
                    <Shimmer />
                </div>
                <div className="relative h-4 w-[90%] rounded-lg bg-white/5 border border-white/5 overflow-hidden">
                    <Shimmer />
                </div>
                <div className="relative h-4 w-[75%] rounded-lg bg-white/5 border border-white/5 overflow-hidden">
                    <Shimmer />
                </div>
                <div className="relative h-4 w-[85%] rounded-lg bg-white/5 border border-white/5 overflow-hidden">
                    <Shimmer />
                </div>
            </motion.div>
        </motion.div>
    );
}
