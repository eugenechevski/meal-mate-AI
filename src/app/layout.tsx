"use client";

import { useMemo } from "react";

import "./globals.css";

import Link from "next/link";

import { Pacifico, Roboto_Serif } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";

import { ContextProvider } from "@/context/Context";

import { AppState, GuestUser, MainUser, SelectionMenu } from "@/core";
import { useCallback, useEffect, useState } from "react";
import buildSelectionMenu from "@/lib/buildSelectionMenu";
import { createClient } from "@/lib/supabase/client";
import { useAppState } from "@/context/app-state/AppStateContext";

import { NextUIProvider } from "@nextui-org/react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSignOut,
  faCompass,
  faUser,
  faSignIn,
  faHome,
} from "@fortawesome/free-solid-svg-icons";

import { DropdownItem, DropdownSection } from "@nextui-org/react";

import { Dropdown, DropdownTrigger, DropdownMenu } from "@nextui-org/react";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import ConfirmModal from "@/components/ConfirmModal";

const primaryFont = Roboto_Serif({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto-serif",
  weight: "400",
});

const secondaryFont = Pacifico({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-pacifico",
  weight: "400",
});

const metadata = {
  title: "Meal Mate AI",
  description:
    "Meal Mate AI is a meal planning app that uses AI to help you plan your meals.",
  icons: {
    icon: "@/app/favicon.ico",
  },
};

const RootState = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();

  const { state, dispatch } = useAppState();
  const supabase = createClient();
  const [selectionMenu, setSelectionMenu] = useState({} as SelectionMenu);
  const [isNavigationsDropdownOpen, setNavigationsDropdownOpen] =
    useState(false);
  const [isPageLeaveConfirmModalOpen, setIsPageLeaveConfirmModalOpen] =
    useState(false);
  const [previousPathname, setPreviousPathname] = useState("");
  const [currentPathname, setCurrentPathname] = useState("");

  // Build the selection menu
  useEffect(() => {
    (async () => {
      let rawData: DBRawMenuData | LocalRawMenuData | null;
      let selectionMenu: SelectionMenu | null;

      // Fetch the raw data from the database
      const { data: recipesData, error } = await supabase.from("recipes")
        .select(`
          id,
          name,
          cuisine,
          ingredients (
            id,
            name,
            amount,
            unit
          ),
          images (
            id,
            url,
            title,
            source,
            source_url,
            height,
            width
          ),
          nutrition (
            id,
            calories_per_serving,
            carbohydrates,
            fat,
            protein,
            servings
          ),
          steps (
            id,
            description,
            step_order
          )
        `);

      if (!error && recipesData) {
        // Build the selection menu from the fetched data
        rawData = recipesData as DBRawMenuData;
        selectionMenu = buildSelectionMenu(rawData, "db");
      } else {
        // Fetch the raw data from the local file
        rawData = (await import("../../initialSelectionMenu.json"))
          .recipes as LocalRawMenuData;
        selectionMenu = buildSelectionMenu(rawData, "local");
      }

      // Set the selection menu
      if (selectionMenu) {
        setSelectionMenu(selectionMenu);
      }
    })();
  }, [supabase]);

  const onSignedIn = useCallback(
    async (user: any) => {
      // Initialize saved meal plans
      let savedMealPlans: { [date: number]: MealPlanData } = {};
      if (user) {
        // Perform the fetching of saved meals for the user
        const { data: mealData, error } = await supabase
          .from("meal_plans")
          .select(
            `
            plan_id,
            plan_date,
            days (
              day_id,
              day_number,
              meals (
                meal_id,
                meal_number,
                recipe_id
              )
            )`
          )
          .eq("user_id", user.id);

        if (!error && mealData) {
          // Construct the saved meal plans
          for (const mealPlan of mealData) {
            const planDate = mealPlan.plan_date
              ? new Date(mealPlan.plan_date)
              : Date.now();
            savedMealPlans[planDate as number] = {};

            for (const day of mealPlan.days) {
              savedMealPlans[planDate as number][day.day_number as number] = {};

              for (const meal of day.meals) {
                // Fetch the recipe names and cuisines
                const { data: recipeData, error: recipeError } = await supabase
                  .from("recipes")
                  .select("name, cuisine")
                  .eq("id", meal.recipe_id as string);

                if (!recipeError) {
                  let name = recipeData[0].name as string;
                  let cuisine = recipeData[0].cuisine as string;
                  let ingredients =
                    selectionMenu.items[cuisine][name].ingredients;
                  let steps = selectionMenu.items[cuisine][name].steps.map(
                    (step) => step.description
                  );
                  let nutrition = selectionMenu.items[cuisine][name].nutrition;

                  // Add the meal to the saved meal plans
                  savedMealPlans[planDate as number][day.day_number as number][
                    meal.meal_number as number
                  ] = {
                    name,
                    cuisine,
                    ingredients,
                    steps,
                    nutrition,
                  };
                }
              }
            }
          }
        }
      }

      // if the user doesn't have the record in the database
      // create one
      const { data: userData } = await supabase.auth.getUser();
      if (userData) {
        const { data: userRecord, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("id", userData.user?.id as string);

        if (userRecord?.length === 0 || userError) {
          // create the user's record in the database
          await supabase.from("users").insert({
            id: userData.user?.id as string,
            username: userData.user?.email as string,
            email: userData.user?.email as string,
          });
        }
      }

      dispatch({
        type: "SET_APP_STATE",
        payload: new AppState(
          new MainUser(user.id, user.email, user.email, savedMealPlans),
          selectionMenu
        ),
      });
    },
    [dispatch, selectionMenu, supabase]
  );

  const onSignedOut = useCallback(() => {
    // Fetch saved meal plans from local storage
    let savedMealPlans: { [date: number]: MealPlanData } = {};
    if (
      typeof window !== "undefined" &&
      localStorage.getItem("savedMealPlans")
    ) {
      savedMealPlans = JSON.parse(localStorage.getItem("savedMealPlans")!);
    }

    dispatch({
      type: "SET_APP_STATE",
      payload: new AppState(new GuestUser(savedMealPlans), selectionMenu),
    });
  }, [dispatch, selectionMenu]);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") {
        // handle initial session
        if (session?.user) {
          onSignedIn(session.user);
        } else {
          onSignedOut();
        }
      } else if (event === "SIGNED_IN") {
        // handle sign in event
        onSignedIn(session?.user);
      } else if (event === "SIGNED_OUT") {
        // handle sign out event
        onSignedOut();
      } else if (event === "PASSWORD_RECOVERY") {
        // handle password recovery event
      } else if (event === "TOKEN_REFRESHED") {
        // handle token refreshed event
      } else if (event === "USER_UPDATED") {
        // handle user updated event
      }
    });

    // Cleanup function
    return () => {
      data.subscription.unsubscribe();
    };
  }, [selectionMenu, onSignedIn, onSignedOut, supabase.auth]);

  const handleConfirmSaveUnsavedChanges = useCallback(() => {
    // Save the state

    // Local save
    if (state.appState.user instanceof GuestUser) {
      // TODO
    }
    // Remote save
    else if (state.appState.user instanceof MainUser) {
      // TODO
    }
  }, [state.appState.user]);

  const handleRejectUnsavedChanges = useCallback(() => {
    // Reset the state
    // TODO
  }, []);

  const floatingLogo = useMemo(
    () => (
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
        whileHover={{ scale: 1.1 }}
        className="primary-icon bg-primary-coal mb-2"
      >
        <Link href="/start">
          <FontAwesomeIcon icon={faHome} size="sm" />
        </Link>
      </motion.button>
    ),
    []
  );

  const userDropdown = useMemo(
    () => (
      <Dropdown className="bg-primary-coal text-primary-cream">
        <DropdownTrigger>
          <div className="flex items-center">
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 2 }}
              whileHover={{ scale: 1.1 }}
              className="primary-icon bg-primary-coal"
            >
              <FontAwesomeIcon icon={faUser} size="sm" />
            </motion.button>
          </div>
        </DropdownTrigger>
        <DropdownMenu aria-label="Static Actions" disabledKeys={["user"]}>
          <DropdownItem key={"user"}>
            <span className="ml-3">Hello, </span>
            {state?.appState?.user instanceof MainUser ? (
              <span className="">
                {state?.appState?.user?.username?.split("@")[0]}
              </span>
            ) : (
              <span className="">Guest</span>
            )}
          </DropdownItem>
          <DropdownSection className="border-t-2 border-primary-cream mt-2 pt-2">
            <DropdownItem href="/saved-meals">Saved meals</DropdownItem>
            <DropdownItem href="/about">About</DropdownItem>
          </DropdownSection>
          <DropdownSection className="border-t-2 border-primary-cream mt-2">
            {state?.appState?.user instanceof MainUser ? (
              <DropdownItem href="/auth/sign-out" className="flex">
                <FontAwesomeIcon icon={faSignOut} size="sm" />
                <span className="ml-2">Sign out</span>
              </DropdownItem>
            ) : (
              <DropdownItem href="/auth/login" className="flex">
                <FontAwesomeIcon icon={faSignIn} size="sm" />
                <span className="ml-2">Sign-in</span>
              </DropdownItem>
            )}
          </DropdownSection>
        </DropdownMenu>
      </Dropdown>
    ),
    [state?.appState?.user]
  );

  const navigationBar = useMemo(() => {
    return (
      <nav className="absolute w-full h-[10vh] left-0 top-0">
        <div className="z-[99] fixed top-7 right-7 flex flex-col gap-3">
          {/** Custom  trigger */}
          <motion.button
            className="primary-icon bg-primary-coal"
            onClick={() => setNavigationsDropdownOpen((prev) => !prev)}
            whileHover={{
              scale: 1.1,
              transition: { duration: 0.1 },
            }}
            whileTap={{ scale: 0.9 }}
          >
            <FontAwesomeIcon icon={faCompass} />
          </motion.button>
          {isNavigationsDropdownOpen && (
            <motion.div
              initial={{
                opacity: 0,
                height: 0,
              }}
              animate={{
                opacity: 1,
                height: "100%",
              }}
              transition={{
                duration: 1,
              }}
              exit={{
                opacity: 0,
                height: 0,
              }}
              className="flex flex-col justify-center items-center w-12"
            >
              {floatingLogo}
              {userDropdown}
            </motion.div>
          )}
        </div>
      </nav>
    );
  }, [floatingLogo, isNavigationsDropdownOpen, userDropdown]);

  /**
   * Page leave confirmation modal
   *
   * This modal will be shown when the user tries to leave the page with unsaved changes.
   * The user can either save the changes or reject them.
   * Regardless, the user is redirected where they want to go.
   * The state is saved locally or remotely depending on the user type.
   */
  const unsavedChangesModal = useMemo(() => {
    return (
      <ConfirmModal
        confirmAction={handleConfirmSaveUnsavedChanges}
        cancelAction={handleRejectUnsavedChanges}
        title="Save unsaved changes?"
        message={"You have unsaved changes. Do you want to save them?"}
        isConfirmationOpen={isPageLeaveConfirmModalOpen}
        onConfirmationOpenChange={setIsPageLeaveConfirmModalOpen}
      />
    );
  }, [
    handleConfirmSaveUnsavedChanges,
    handleRejectUnsavedChanges,
    isPageLeaveConfirmModalOpen,
  ]);

  /**
   * Page leave confirmation
   * Adds a listener to the beforeunload event
   * to show the page leave confirmation modal
   */
  useEffect(() => {
    const handleBeforeUnload = (event: any) => {
      // if the route doesn't start with /days, show the modal
      if (!currentPathname.startsWith("/days") && previousPathname.startsWith("/days")) {
        setIsPageLeaveConfirmModalOpen(true);
        event.preventDefault();
        event.returnValue = "";
      }

      return event.returnValue;
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isPageLeaveConfirmModalOpen, currentPathname, previousPathname]);

  useEffect(() => {
    setPreviousPathname(currentPathname);
    setCurrentPathname(pathname);
  }, [currentPathname, pathname])

  return (
    <div className="relative">
      {/* Navigations */}
      {navigationBar}

      {/* Page leave confirmation modal */}
      {unsavedChangesModal}

      {/* Main content */}
      {children}
    </div>
  );
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${primaryFont.variable} ${secondaryFont.variable}`}
    >
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content={metadata.description} />
        <link rel="icon" href={metadata.icons.icon} type="image/x-icon" />
        <title>{metadata.title}</title>
      </head>
      <body className="bg-primary-cream relative text-primary-coal text-shadow scroll-smooth hide-scrollbar snap-center snap-normal snap-mandatory max-h-max max-w-max overflow-x-hidden">
        <ContextProvider>
          <NextUIProvider>
            <RootState>{children}</RootState>
          </NextUIProvider>
        </ContextProvider>
        <Analytics />
      </body>
    </html>
  );
}
