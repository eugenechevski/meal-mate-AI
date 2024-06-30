"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFlagCheckered,
  faMap,
  faCheck,
  faClose,
  faCarrot,
  faPlus,
  faPenToSquare,
  faMessage as faChat,
  faPaperPlane,
  faBars,
} from "@fortawesome/free-solid-svg-icons";

import { motion } from "framer-motion";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@nextui-org/react";

import { useAppState } from "@/context/app-state/AppStateContext";
import { useEffect, useMemo, useState, useCallback } from "react";

import { Accordion, AccordionItem } from "@nextui-org/react";
import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  Pagination,
} from "@nextui-org/react";

import { GuestUser, Ingredient, MainUser } from "@/core";

import { createClient } from "@/lib/supabase/client";

import { useRouter as useAppRouter, usePathname } from "next/navigation";

import stringify from "json-stringify-safe";

import { useForm, SubmitHandler, set } from "react-hook-form";

import { useChat } from "ai/react";

import ConfirmModal from "@/components/ConfirmModal";

type IngredientData = {
  name: string;
  amount: number;
  unit: string;
};

const ingredientsColumns = [
  {
    key: "name",
    label: "Ingredient",
  },
  {
    key: "amount",
    label: "Amount",
  },
  {
    key: "unit",
    label: "Unit",
  },
  {
    key: "actions",
    label: "Actions",
  },
];

export default function DaysMealLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const router = useAppRouter();

  const { state, dispatch } = useAppState();
  const [isMealPlanEmpty, setIsMealPlanEmpty] = useState(true);
  const [page, setPage] = useState(1);
  const [isEditUserIngredient, setIsEditUserIngredient] = useState(false);
  const [editedUserIngredient, setEditedUserIngredient] =
    useState<Ingredient>();
  const [isTriggersDropdownOpen, setIsTriggersDropdownOpen] = useState(false);

  const {
    messages: chatMessages,
    input: chatInput,
    handleInputChange: handleChatInputChange,
    handleSubmit: chatHandleSubmit,
  } = useChat();

  const {
    isOpen: isOverviewOpen,
    onOpen: onOverviewOpen,
    onOpenChange: onOverviewOpenChange,
  } = useDisclosure();
  const {
    isOpen: isIngredientsOpen,
    onOpen: onIngredientsOpen,
    onOpenChange: onIngredientsOpenChange,
  } = useDisclosure();
  const {
    isOpen: isChatOpen,
    onOpen: onChatOpen,
    onOpenChange: onChatOpenChange,
  } = useDisclosure();
  const {
    isOpen: isConfirmationOpen,
    onOpen: onConfirmationOpen,
    onOpenChange: onConfirmationOpenChange,
  } = useDisclosure();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<IngredientData>();

  const rowsPerPage = 4;

  const onSubmit: SubmitHandler<IngredientData> = useCallback(
    (data) => {
      const { name, amount, unit } = data;

      const ingredient = new Ingredient(name, Number(amount), unit);

      // Dispatch user ingredient update
      dispatch({ type: "ADD_USER_INGREDIENT", payload: ingredient });
    },
    [dispatch]
  );

  const mealPlanData = useMemo(() => {
    return state?.appState?.currentMealPlan?.getMealPlanData();
  }, [state?.appState?.currentMealPlan]);

  const listIngredientRows = useMemo(() => {
    return Object.values(
      state?.appState?.currentMealPlan?.userIngredients || {}
    );
  }, [state]);

  const pages = useMemo(() => {
    return Math.ceil(listIngredientRows.length / rowsPerPage);
  }, [listIngredientRows]);

  const paginatedListIngredientRows = useMemo(() => {
    return listIngredientRows.slice(
      (page - 1) * rowsPerPage,
      page * rowsPerPage
    );
  }, [listIngredientRows, page]);

  const startEditUserIngredient = useCallback(
    (ingredient: Ingredient) => {
      setIsEditUserIngredient(true);
      setEditedUserIngredient(ingredient);
      setValue("name", ingredient.name);
      setValue("amount", ingredient.amount);
      setValue("unit", ingredient.unit);
    },
    [setValue]
  );

  const confirmEditUserIngredient = useCallback(() => {
    const ingredient = {
      name: watch("name"),
      amount: watch("amount"),
      unit: watch("unit"),
    };
    setIsEditUserIngredient(false);
    dispatch({
      type: "UPDATE_USER_INGREDIENT",
      payload: [editedUserIngredient as Ingredient, ingredient],
    });
  }, [dispatch, editedUserIngredient, watch]);

  const renderCell = useCallback(
    (item: Ingredient, columnKey: keyof Ingredient | "actions") => {
      switch (columnKey) {
        case "name":
          return item.name;
        case "amount":
          return item.amount;
        case "unit":
          return item.unit;
        case "actions":
          return (
            <div className="flex justify-center items-center gap-2">
              <motion.button
                className="primary-icon bg-transparent w-6 h-6"
                onClick={startEditUserIngredient.bind(null, item)}
                whileHover={{
                  scale: 1.1,
                  transition: { duration: 0.1 },
                }}
                whileTap={{ scale: 0.9 }}
              >
                <FontAwesomeIcon icon={faPenToSquare} size="sm" color="black" />
              </motion.button>
              <motion.button
                className="primary-icon bg-primary-red w-6 h-6"
                onClick={() => {
                  dispatch({
                    type: "REMOVE_USER_INGREDIENT",
                    payload: item.name,
                  });
                }}
                whileHover={{
                  scale: 1.1,
                  transition: { duration: 0.1 },
                }}
                whileTap={{ scale: 0.9 }}
              >
                <FontAwesomeIcon icon={faClose} size="sm" />
              </motion.button>
            </div>
          );

        default:
          return item[columnKey];
      }
    },
    [dispatch, startEditUserIngredient]
  );

  const userIngredientsBottomContent = useMemo(() => {
    return (
      <div className="flex flex-col justify-center items-center gap-2">
        {/** New ingredient form */}
        <form className="w-full flex justify-center items-center gap-2">
          {/* Ingredient name */}
          <div className="flex flex-col w-32 p-0">
            <input
              type="text"
              id="name"
              className={`primary-input ${
                errors.name ? "outline-danger-500" : ""
              }`}
              {...register("name", {
                required: true,
                maxLength: 80,
              })}
            />
          </div>
          {/* Ingredient amount */}
          <div className="flex flex-col w-24 p-0">
            <input
              type="number"
              id="amount"
              className={`primary-input ${
                errors.amount ? "outline-danger-500" : ""
              }`}
              {...register("amount", { required: true })}
            />
          </div>
          {/* Ingredient unit */}
          <div className="flex flex-col w-20 p-0">
            <input
              type="text"
              id="unit"
              className={`primary-input ${
                errors.unit ? "outline-danger-500" : ""
              }`}
              {...register("unit", { required: true })}
            />
          </div>
        </form>
        {/* Add a new ingredient button */}
        {isEditUserIngredient ? (
          <div className="flex gap-3">
            <motion.button
              className="primary-icon bg-primary-green h-8 w-8"
              onClick={confirmEditUserIngredient}
              whileHover={{
                scale: 1.1,
                transition: { duration: 0.1 },
              }}
              whileTap={{ scale: 0.9 }}
            >
              <FontAwesomeIcon icon={faCheck} size="sm" />
            </motion.button>
            <motion.button
              className="primary-icon h-8 w-8"
              onClick={setIsEditUserIngredient.bind(null, false)}
              whileHover={{
                scale: 1.1,
                transition: { duration: 0.1 },
              }}
              whileTap={{ scale: 0.9 }}
            >
              <FontAwesomeIcon icon={faClose} size="sm" />
            </motion.button>
          </div>
        ) : (
          <motion.button
            className="primary-icon bg-primary-green w-8 h-8"
            onClick={handleSubmit(onSubmit)}
            whileHover={{
              scale: 1.1,
              transition: { duration: 0.1 },
            }}
            whileTap={{ scale: 0.9 }}
          >
            <FontAwesomeIcon icon={faPlus} size="sm" />
          </motion.button>
        )}

        {/* Pagination */}
        <Pagination
          isCompact
          showControls
          showShadow
          classNames={{
            cursor: "bg-primary-orange",
          }}
          page={page}
          total={pages}
          onChange={(page) => setPage(page)}
        />
      </div>
    );
  }, [
    confirmEditUserIngredient,
    errors.amount,
    errors.name,
    errors.unit,
    handleSubmit,
    isEditUserIngredient,
    onSubmit,
    page,
    pages,
    register,
  ]);

  const handleFinishMealPlan = useCallback(async () => {
    // Update the storage
    if (state?.appState?.user instanceof GuestUser) {
      const { savedMealPlans } = state.appState.user;

      const currentMealPlanData =
        state.appState.currentMealPlan?.getMealPlanData();

      if (Object.keys(currentMealPlanData).length === 0) {
        return;
      }

      // Clean empty nodes
      for (const day in currentMealPlanData) {
        if (Object.keys(currentMealPlanData[day]).length === 0) {
          delete currentMealPlanData[day];
        } else {
          // Check empty meals
          for (const meal in currentMealPlanData[day]) {
            if (Object.keys(currentMealPlanData[day][meal]).length === 0) {
              delete currentMealPlanData[day][meal];
            }
          }
        }
      }

      // Combine the saved meal plans with the current meal plan
      savedMealPlans[new Date().toISOString()] = currentMealPlanData;

      // Stringify the meal plans
      const stringified = stringify(savedMealPlans);

      localStorage.setItem("savedMealPlans", stringified);
    } else if (state?.appState?.user instanceof MainUser) {
      // Add the new meal plan to the user's saved meal plans
      const { data: mealPlanDataInsert, error: mealPlanDataInsertError } =
        await supabase
          .from("meal_plans")
          .insert([
            {
              plan_date: new Date().toISOString(),
              user_id: state.appState.user.id,
            },
          ])
          .select();

      if (!mealPlanDataInsert || mealPlanDataInsertError) {
        console.error(mealPlanDataInsertError);
        return;
      }

      for (const day in mealPlanData) {
        // Insert day
        const { data: dayInsertData, error: dayInsertError } = await supabase
          .from("days")
          .insert([
            {
              day_number: Number(day),
              plan_id: mealPlanDataInsert[0]?.plan_id,
            },
          ])
          .select();

        if (!dayInsertData || dayInsertError) {
          console.error(dayInsertError);
          continue;
        }

        for (const meal in mealPlanData[day]) {
          // Insert meal

          const mealData = mealPlanData[day][meal];
          // Get the recipe id
          const { data: recipeData, error: recipeError } = await supabase
            .from("recipes")
            .select("id")
            .eq("name", mealData.name);

          if (!recipeData || recipeError) {
            console.error(recipeError);
            // Delete the day
            await supabase
              .from("days")
              .delete()
              .eq("day_id", dayInsertData[0]?.day_id);
            continue;
          }

          // Insert meal
          const { error: mealInsertDataError } = await supabase
            .from("meals")
            .insert([
              {
                meal_number: Number(meal),
                day_id: dayInsertData[0]?.day_id,
                recipe_id: recipeData[0]?.id as string,
              },
            ]);

          if (mealInsertDataError) {
            console.error(mealInsertDataError);
            // Delete the day
            await supabase
              .from("days")
              .delete()
              .eq("day_id", dayInsertData[0]?.day_id);
          }
        }
      }
    }

    // Save the meal plan
    dispatch({ type: "SAVE_MEAL_PLAN" });

    // Start a new meal plan
    dispatch({ type: "START_NEW_MEAL_PLAN" });

    // Close the modal
    onOverviewOpenChange();

    // Redirect to the start page
    router.replace("/start");
  }, [
    dispatch,
    mealPlanData,
    onOverviewOpenChange,
    router,
    state.appState.currentMealPlan,
    state.appState.user,
    supabase,
  ]);

  const confirmFinishMealPlan = useCallback(() => {
    onConfirmationOpenChange();
    handleFinishMealPlan();
  }, [handleFinishMealPlan, onConfirmationOpenChange]);

  const cancelFinishMealPlan = useCallback(() => {
    onConfirmationOpenChange();
  }, [onConfirmationOpenChange]);

  const mealPlanAccordion = useMemo(() => {
    return (
      <>
        {isMealPlanEmpty ? (
          <p className="text-center">There is no meal plan yet.</p>
        ) : (
          <Accordion>
            {Object.keys(mealPlanData).map((day) => (
              <AccordionItem key={day} title={"Day " + day}>
                <Accordion>
                  {Object.keys(mealPlanData[Number(day)]).map((meal) => (
                    <AccordionItem key={meal} title={"Meal " + meal}>
                      {(() => {
                        const mealData =
                          mealPlanData[Number(day)][Number(meal)];
                        return (
                          <div className="flex flex-col justify-center items-start gap-3">
                            {/* Meal information */}
                            <p className="font-bold text-2xl self-center">
                              {mealData.name} - {mealData.cuisine}
                            </p>
                            <p>
                              <strong>Ingredients</strong>:{" "}
                              {mealData.ingredients
                                .map((ingredient) => ingredient.name)
                                .join(", ")}
                            </p>
                            <p>
                              <strong>Steps</strong>:{" "}
                              {mealData.steps.join(", ")}
                            </p>
                            {mealData.nutrition && (
                              <p>
                                <strong>Nutrition</strong>:{" "}
                                <ul className="list-disc list-inside">
                                  <li>
                                    <strong>servings</strong>:{" "}
                                    {mealData.nutrition.servings}
                                  </li>
                                  <li>
                                    <strong>calories per serving</strong>:{" "}
                                    {mealData.nutrition.caloriesPerServing}
                                  </li>
                                  <li>
                                    <strong>carbohydrates</strong>:{" "}
                                    {mealData.nutrition.carbohydrates} g
                                  </li>
                                  <li>
                                    <strong>protein</strong>:{" "}
                                    {mealData.nutrition.protein} g
                                  </li>
                                  <li>
                                    <strong>fat</strong>:{" "}
                                    {mealData.nutrition.fat} g
                                  </li>
                                </ul>
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </AccordionItem>
                  ))}
                </Accordion>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </>
    );
  }, [isMealPlanEmpty, mealPlanData]);

  const mealPlanOverview = useMemo(() => {
    return (
      <Modal
        isOpen={isOverviewOpen}
        placement="center"
        onOpenChange={onOverviewOpenChange}
        backdrop="blur"
      >
        <ModalContent>
          <ModalHeader className="flex justify-center">
            Meal Plan Overview
          </ModalHeader>
          <ModalBody>{mealPlanAccordion}</ModalBody>
          <ModalFooter className="flex justify-center items-center">
            {!isMealPlanEmpty && (
              <motion.button
                className="primary-icon bg-primary-green"
                onClick={onConfirmationOpen}
              >
                <FontAwesomeIcon icon={faFlagCheckered} />
              </motion.button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
  }, [
    isMealPlanEmpty,
    isOverviewOpen,
    mealPlanAccordion,
    onConfirmationOpen,
    onOverviewOpenChange,
  ]);

  const ingredientsTable = useMemo(() => {
    return (
      <Modal
        isOpen={isIngredientsOpen}
        placement="center"
        className="z-[101]"
        onOpenChange={onIngredientsOpenChange}
        backdrop="blur"
      >
        <ModalContent>
          <ModalHeader className="flex justify-center">
            User Ingredients
          </ModalHeader>
          <ModalBody className="flex flex-col justify-start items-center">
            <Table
              className="w-full"
              bottomContent={userIngredientsBottomContent}
            >
              <TableHeader columns={ingredientsColumns}>
                {(column) => (
                  <TableColumn
                    key={column.key}
                    align={column.key === "actions" ? "center" : "start"}
                  >
                    {column.label}
                  </TableColumn>
                )}
              </TableHeader>
              <TableBody
                emptyContent={"No rows to display."}
                items={paginatedListIngredientRows}
              >
                {(item) => (
                  <TableRow key={item.name}>
                    {(columnKey) => (
                      <TableCell>
                        {renderCell(
                          item,
                          columnKey as "actions" | keyof Ingredient
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ModalBody>
        </ModalContent>
      </Modal>
    );
  }, [
    isIngredientsOpen,
    onIngredientsOpenChange,
    paginatedListIngredientRows,
    renderCell,
    userIngredientsBottomContent,
  ]);

  const chatBodyContent = useMemo(() => {
    return (
      <>
        <div className="primary-form flex flex-col gap-2 h-[50vh] w-full overflow-auto">
          {chatMessages.length > 0 ? (
            chatMessages.map((message, index) => (
              <div
                key={index}
                className={`flex flex-col gap-2 max-h-max min-w-[40%] max-w-[90%] p-3 rounded ${
                  message.role === "assistant"
                    ? "self-start bg-primary-orange text-black"
                    : "self-end bg-primary-green text-white"
                }`}
              >
                <h1 className="text-start font-bold">
                  {message.role === "assistant" ? "Chef Assistant" : "You"}
                </h1>
                <p className="text-wrap whitespace-normal w-full min-h-6 max-h-max overflow-auto">
                  {message.content}
                </p>
                <p className="text-end italic">
                  {new String(message.createdAt?.getHours()).padStart(2, "0") +
                    ":" +
                    new String(message.createdAt?.getMinutes()).padStart(
                      2,
                      "0"
                    )}
                </p>
              </div>
            ))
          ) : (
            <p className="text-center">No messages yet.</p>
          )}
        </div>
      </>
    );
  }, [chatMessages]);

  const chatModal = useMemo(() => {
    return (
      <Modal
        isOpen={isChatOpen}
        onOpenChange={onChatOpenChange}
        placement="center"
      >
        <ModalContent>
          <ModalHeader className="flex justify-center">Chat</ModalHeader>
          <ModalBody>{chatBodyContent}</ModalBody>
          <ModalFooter className="justify-center items-center">
            <form
              className="flex gap-2 justify-center items-center"
              onSubmit={chatHandleSubmit}
            >
              <input
                type="text"
                value={chatInput}
                onChange={handleChatInputChange}
                className="primary-input"
              />
              <motion.button
                className="primary-icon bg-primary-green"
                type="submit"
                whileHover={{
                  scale: 1.1,
                  transition: { duration: 0.1 },
                }}
                whileTap={{ scale: 0.9 }}
              >
                <FontAwesomeIcon icon={faPaperPlane} />
              </motion.button>
            </form>
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
  }, [
    isChatOpen,
    onChatOpenChange,
    chatBodyContent,
    chatHandleSubmit,
    chatInput,
    handleChatInputChange,
  ]);

  const mealPlanFinishConfirmModal = useMemo(() => {
    return (
      <ConfirmModal
        confirmAction={confirmFinishMealPlan}
        cancelAction={cancelFinishMealPlan}
        title="Finish Meal Plan"
        message="Are you sure you want to finish the meal plan?"
        isConfirmationOpen={isConfirmationOpen}
        onConfirmationOpenChange={onConfirmationOpenChange}
      />
    );
  }, [
    cancelFinishMealPlan,
    confirmFinishMealPlan,
    isConfirmationOpen,
    onConfirmationOpenChange,
  ]);

  const triggersDropdown = useMemo(() => {
    return (
      <div className="z-[50] fixed left-0 right-0 translate-x-[75vw] translate-y-[26vh] flex flex-col gap-3">
        <motion.button
          className="primary-icon bg-primary-coal"
          onClick={() => setIsTriggersDropdownOpen((prev) => !prev)}
          whileHover={{
            scale: 1.1,
            transition: { duration: 0.1 },
          }}
          whileTap={{ scale: 0.9 }}
        >
          <FontAwesomeIcon icon={faBars} />
        </motion.button>
        {isTriggersDropdownOpen && (
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
            className="flex flex-col gap-3"
          >
            <motion.button
              className="primary-icon"
              onClick={onOverviewOpen}
              whileHover={{
                scale: 1.1,
                transition: { duration: 0.1 },
              }}
              whileTap={{ scale: 0.9 }}
            >
              <FontAwesomeIcon icon={faMap} />
            </motion.button>
            <motion.button
              className="primary-icon bg-primary-orange"
              onClick={onIngredientsOpen}
              whileHover={{
                scale: 1.1,
                transition: { duration: 0.1 },
              }}
              whileTap={{ scale: 0.9 }}
            >
              <FontAwesomeIcon icon={faCarrot} />
            </motion.button>
            <motion.button
              className="primary-icon bg-primary-green"
              onClick={onChatOpen}
              whileHover={{
                scale: 1.1,
                transition: { duration: 0.1 },
              }}
              whileTap={{ scale: 0.9 }}
            >
              <FontAwesomeIcon icon={faChat} />
            </motion.button>
          </motion.div>
        )}
      </div>
    );
  }, [isTriggersDropdownOpen, onChatOpen, onIngredientsOpen, onOverviewOpen]);

  /**
   * Check if the meal plan is empty
   * and update the state accordingly
   */
  useEffect(() => {
    if (mealPlanData && Object.keys(mealPlanData).length !== 0) {
      setIsMealPlanEmpty(false);
    }
  }, [mealPlanData]);

  return (
    <main className="relative">
      {/* Triggers dropdown */}
      {triggersDropdown}

      {/* Chat */}
      {chatModal}

      {/* Meal plan overview */}
      {mealPlanOverview}

      {/** User ingredients table */}
      {ingredientsTable}

      {/* Confirmation modal */}
      {mealPlanFinishConfirmModal}

      {children}
    </main>
  );
}
