"use client";

import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import landingPageImg from "@/assets/landing-page.png";
import Image from "next/image";
import Button from "@/components/Button";
import { motion } from "framer-motion";

export default function Page() {
  return (
    <motion.main
      className="w-screen h-screen flex flex-col justify-center items-center gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <motion.h1
        className="text-3xl font-secondary"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1 }}
      >
        Simplify Your Meal Planning
      </motion.h1>
      <motion.figure
        className="rounded-full shadow-2xl"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1 }}
      >
        <Image
          src={landingPageImg}
          width={300}
          height={300}
          alt="Landing Page"
          className="rounded-full shadow-2xl"
        ></Image>
      </motion.figure>
      <motion.p
        className="font-primary italic"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1 }}
      >
        Deciding what to eat has never been easier.
      </motion.p>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Button size="md">
          <FontAwesomeIcon icon={faArrowRight} className="w-12" size="2x" />
        </Button>
      </motion.div>
    </motion.main>
  );
}
