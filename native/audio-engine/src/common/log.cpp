// Common utils for logging into console.

#include "log.h"

#include <cstdarg>
#include <cstdio>

namespace disband::app
{
void log(const char* channel, const char* format, ...)
{
    std::fprintf(stderr, "[%s] ", channel);
    va_list args;
    va_start(args, format);
    std::vfprintf(stderr, format, args);
    va_end(args);
    std::fflush(stderr);
}
} // namespace disband::app
