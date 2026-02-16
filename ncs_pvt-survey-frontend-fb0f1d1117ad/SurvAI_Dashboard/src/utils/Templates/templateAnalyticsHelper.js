export const PIE_COLORS = [
  "#1958F7",
  "#FFBB71",
  "#FFF99E",
  "#FF7284",
  "#9C88FF",
  "#FF6B6B",
];

export const processChartData = (questionData) => {
  if (!questionData) return [];

  if (questionData.criteria === "categorical") {
    const counts = {};
    
    if (questionData.categories && questionData.categories.length > 0) {
      questionData.categories.forEach((category) => {
        counts[category] = 0;
      });
    }

    if (questionData.answers && questionData.answers.length > 0) {
      questionData.answers.forEach((answer) => {
        if (answer && Object.prototype.hasOwnProperty.call(counts, answer)) {
          counts[answer]++;
        }
      });
    }

    return Object.entries(counts).map(([name, value]) => ({
      name: name === "None of the above" ? "Skipped" : name,
      value: value || 0,
    }));
  } else if (questionData.criteria === "scale") {
    const maxRange = parseInt(questionData.scales || 5);
    const ratings = {};
    for (let i = 1; i <= maxRange; i++) {
      ratings[i] = 0;
    }

    // Count actual answers if they exist
    if (questionData.answers && questionData.answers.length > 0) {
      questionData.answers.forEach((answer) => {
        const rating = parseInt(answer);
        if (rating >= 1 && rating <= maxRange) {
          ratings[rating]++;
        }
      });
    }

    return Object.entries(ratings).map(([rating, count]) => ({
      name: `${rating} Star${rating !== "1" ? "s" : ""}`,
      value: count,
    }));
  }
  return [];
};

export const calculatePercentages = (data) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return data.map((item) => ({
    ...item,
    percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : 0,
  }));
};

export const hasResponses = (questionData) => {
  if (!questionData) return false;
  if (questionData.answers) {
    return questionData.answers.some(
      (answer) => answer !== null && answer !== "" && answer !== undefined
    );
  }
  return false;
};

export const hasQuestionOptions = (questionData) => {
  if (!questionData) return false;
  
  if (questionData.criteria === "categorical") {
    return questionData.categories && questionData.categories.length > 0;
  } else if (questionData.criteria === "scale") {
    return questionData.scales && parseInt(questionData.scales) > 0;
  }
  
  return false;
};

export const isOpenQuestion = (questionData) => {
  return questionData?.criteria === "text" || questionData?.criteria === "open";
};

export const getTextResponses = (questionData) => {
  if (!questionData) return [];
  return (
    questionData.answers?.filter((answer) => answer && answer.trim() !== "") ||
    []
  );
};

export const getWordCloudImage = (questionData) => {
  if (!questionData || !isOpenQuestion(questionData)) return null;
  const stats = questionData.Stats || questionData.stats;
  if (!stats) return null;
  const candidates = [
    stats.WordCloudImage,
    stats.wordCloudImage,
    stats.WordCloud,
    stats.wordCloud,
    stats.wordcloud,
    stats.word_cloud,
    stats.word_cloud_image,
    stats.image,
    stats,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate;
    }
  }
  return null;
};

export const calculateAverageRating = (questionData) => {
  if (!questionData || questionData.criteria !== "scale") return 0;
  const maxRange = parseInt(questionData.scales || 5);
  const ratings =
    questionData.answers
      ?.map((answer) => parseInt(answer))
      ?.filter(
        (rating) => !isNaN(rating) && rating >= 1 && rating <= maxRange
      ) || [];

  if (ratings.length === 0) return 0;
  const sum = ratings.reduce((acc, rating) => acc + rating, 0);
  return (sum / ratings.length).toFixed(1);
};

export const parseSurveyInfo = (surveyData, surveyId) => {
    return {
      surveyId: surveyId || surveyData?.SurveyId || surveyData?.SurveyID || "",
      templateName: surveyData?.TemplateName || surveyData?.Name || "N/A",
      recipientName: surveyData?.RecipientName || surveyData?.Recipient || "N/A",
      status: surveyData?.Status || "unknown",
      type: surveyData?.Type || "N/A",
      surveyUrl: surveyData?.SurveyUrl || "",
      creationDate: surveyData?.CreationDate || surveyData?.LaunchDate || "N/A",
      completionDate: surveyData?.CompletionDate || "N/A",
      launchDate: surveyData?.LaunchDate || surveyData?.CreationDate || "N/A",
      age: surveyData?.age || surveyData?.Age,
      gender: surveyData?.gender || surveyData?.Gender,
      numOfTrips: surveyData?.numOfTrips || surveyData?.NumOfTrips,
      accessibility: surveyData?.accessibility || surveyData?.Accessibility,
      riderName: surveyData?.riderName || surveyData?.RiderName,
      rideId: surveyData?.rideId || surveyData?.RideID || surveyData?.RideId,
      tenantId: surveyData?.tenantId || surveyData?.TenantID || surveyData?.TenantId,
      recipientBiodata: surveyData?.recipientBiodata || surveyData?.Biodata || "No biodata available",
    };
};

export const getFilterChips = (appliedFilters) => {
  const chips = [];

  if (appliedFilters.AgeRange) {
    const [min, max] = appliedFilters.AgeRange;
    let ageLabel = "";
    if (min === null && max === 18) ageLabel = "<18";
    else if (min === 19 && max === 24) ageLabel = "19-24";
    else if (min === 25 && max === 32) ageLabel = "25-32";
    else if (min === 32 && max === null) ageLabel = ">32";
    else ageLabel = `${min || "0"}-${max || "∞"}`;

    chips.push({ key: "age", label: `Age: ${ageLabel}` });
  }

  if (appliedFilters.Gender) {
    chips.push({ key: "gender", label: `Gender: ${appliedFilters.Gender}` });
  }

  if (appliedFilters.Accessibility) {
    const accessLabel =
      appliedFilters.Accessibility === "Wheelchair"
        ? "Needs Wheelchair"
        : "Other";
    chips.push({
      key: "accessibility",
      label: `Accessibility: ${accessLabel}`,
    });
  }

  if (appliedFilters.TripsRange) {
    const [min, max] = appliedFilters.TripsRange;
    chips.push({
      key: "trips",
      label: `Trips: ${min === max ? min : `${min}-${max}`}`,
    });
  }

  return chips;
};

export const prepareDemographicsChartData = (demographics) => {
  if (!demographics) return null;

  const ageOrder = ['0-18', '19-24', '25-32', '33+'];
  const ageData = Object.entries(demographics.AgeCounts || {}).map(([name, counts]) => ({
    name,
    Total: counts?.Total ?? 0,
    Completed: counts?.Completed ?? 0,
  }));
  
  const sortedAgeData = ageData.sort((a, b) => {
    const indexA = ageOrder.indexOf(a.name);
    const indexB = ageOrder.indexOf(b.name);
    return indexA - indexB;
  });

  return {
    age: sortedAgeData,
    gender: Object.entries(demographics.GenderCounts || {}).map(
      ([name, counts]) => ({
        name,
        Total: counts?.Total ?? 0,
        Completed: counts?.Completed ?? 0,
      })
    ),
    accessibility: Object.entries(demographics.AccessibilityCounts || {}).map(
      ([name, counts]) => ({
        name,
        Total: counts?.Total ?? 0,
        Completed: counts?.Completed ?? 0,
      })
    ),
    trips: Object.entries(demographics.TripCounts || {}).map(
      ([name, counts]) => ({
        name,
        Total: counts?.Total ?? 0,
        Completed: counts?.Completed ?? 0,
      })
    ),
    summary: {
      total: demographics?.SurveyCounts?.Total ?? 0,
      completed: demographics?.SurveyCounts?.Completed ?? 0,
    },
  };
};
