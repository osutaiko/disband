#include "session.h"

#include <cmath>

namespace disband::session
{
// Check if absolute error is within tolerance
CriterionJudgment evaluateCriterionAbs(double errorValue, double tolerance)
{
    CriterionJudgment evaluation;
    evaluation.error = errorValue;
    evaluation.pass = std::abs(errorValue) <= tolerance;
    return evaluation;
}

// Check if value fits inside tolerance range
CriterionJudgment evaluateCriterionRange(double value, double toleranceLower, double toleranceUpper)
{
    CriterionJudgment evaluation;
    evaluation.error = value;
    evaluation.pass = toleranceLower <= value && value <= toleranceUpper;
    return evaluation;
}
} // namespace disband::session
