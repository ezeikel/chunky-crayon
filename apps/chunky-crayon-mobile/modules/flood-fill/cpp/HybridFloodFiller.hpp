///
/// HybridFloodFiller.hpp
/// Hand-written C++ implementation of the FloodFiller Nitro HybridObject.
///
/// Owns a native RGBA_8888 buffer and runs a span-scanline flood fill over it
/// in place. Because the buffer is owning native memory, floodFill() can be
/// called off the JS thread (from a worklet runtime) and the JS thread reads
/// the mutated bytes back zero-copy via getBuffer() once the call resolves.
///
#pragma once

#include "HybridFloodFillerSpec.hpp"
#include <NitroModules/ArrayBuffer.hpp>
#include <cstdint>
#include <cstdlib>
#include <memory>
#include <vector>

namespace margelo::nitro::chunkycrayon {

class HybridFloodFiller : public HybridFloodFillerSpec {
public:
  HybridFloodFiller() : HybridObject(TAG) {}

  // Copy the JS pixel bytes into an owning native buffer (one copy). The JS
  // ArrayBuffer is borrowed and only valid during this synchronous call, so we
  // must copy to hold it across the later off-thread floodFill().
  void load(const std::shared_ptr<ArrayBuffer>& pixels, double width,
            double height) override {
    _width = static_cast<size_t>(width);
    _height = static_cast<size_t>(height);
    _buffer = ArrayBuffer::copy(pixels->data(), pixels->size());
  }

  // Span-scanline flood fill (matches the web worker algorithm): walk to the
  // start of a run, sweep right filling it, seed only ONE pixel per contiguous
  // above/below run. `visited` is a flat byte map, not a hash set. Mutates the
  // owning buffer in place. Returns the number of pixels filled.
  double floodFill(double x, double y, double r, double g, double b, double a,
                   double tolerance) override {
    if (_buffer == nullptr || _width == 0 || _height == 0) {
      return 0;
    }

    const size_t w = _width;
    const size_t h = _height;
    uint8_t* px = _buffer->data();
    if (px == nullptr) {
      return 0;
    }

    const int tol = static_cast<int>(tolerance);
    const uint8_t fr = static_cast<uint8_t>(r);
    const uint8_t fg = static_cast<uint8_t>(g);
    const uint8_t fb = static_cast<uint8_t>(b);
    const uint8_t fa = static_cast<uint8_t>(a);

    size_t sx = static_cast<size_t>(x < 0 ? 0 : x);
    size_t sy = static_cast<size_t>(y < 0 ? 0 : y);
    if (sx >= w) sx = w - 1;
    if (sy >= h) sy = h - 1;

    const size_t startIdx = (sy * w + sx) * 4;
    const uint8_t targetR = px[startIdx];
    const uint8_t targetG = px[startIdx + 1];
    const uint8_t targetB = px[startIdx + 2];

    // Seed already at fill colour (tight tolerance) → nothing to do.
    if (std::abs(static_cast<int>(targetR) - static_cast<int>(fr)) <= 5 &&
        std::abs(static_cast<int>(targetG) - static_cast<int>(fg)) <= 5 &&
        std::abs(static_cast<int>(targetB) - static_cast<int>(fb)) <= 5) {
      return 0;
    }
    // Don't start on a black line (stroke boundary).
    if (targetR < 30 && targetG < 30 && targetB < 30) {
      return 0;
    }

    auto matches = [&](size_t idx) -> bool {
      return std::abs(static_cast<int>(px[idx]) - static_cast<int>(targetR)) <=
                 tol &&
             std::abs(static_cast<int>(px[idx + 1]) -
                      static_cast<int>(targetG)) <= tol &&
             std::abs(static_cast<int>(px[idx + 2]) -
                      static_cast<int>(targetB)) <= tol;
    };

    std::vector<uint8_t> visited(w * h, 0);
    std::vector<size_t> stack;
    stack.reserve(1024);
    stack.push_back(sy * w + sx);

    size_t filled = 0;

    while (!stack.empty()) {
      const size_t seed = stack.back();
      stack.pop_back();

      size_t cx = seed % w;
      const size_t cy = seed / w;

      if (visited[seed] == 1) {
        continue;
      }

      // Walk left to the start of the run.
      while (cx > 0 && matches(((cy * w) + (cx - 1)) * 4)) {
        cx--;
      }

      bool spanAbove = false;
      bool spanBelow = false;

      while (cx < w) {
        const size_t flat = cy * w + cx;
        const size_t pi = flat * 4;

        if (!matches(pi)) {
          break;
        }

        if (visited[flat] == 0) {
          visited[flat] = 1;
          px[pi] = fr;
          px[pi + 1] = fg;
          px[pi + 2] = fb;
          px[pi + 3] = fa;
          filled++;
        }

        if (cy > 0) {
          const size_t aFlat = (cy - 1) * w + cx;
          const bool aCanFill = visited[aFlat] == 0 && matches(aFlat * 4);
          if (!spanAbove && aCanFill) {
            stack.push_back(aFlat);
            spanAbove = true;
          } else if (spanAbove && !aCanFill) {
            spanAbove = false;
          }
        }

        if (cy < h - 1) {
          const size_t bFlat = (cy + 1) * w + cx;
          const bool bCanFill = visited[bFlat] == 0 && matches(bFlat * 4);
          if (!spanBelow && bCanFill) {
            stack.push_back(bFlat);
            spanBelow = true;
          } else if (spanBelow && !bCanFill) {
            spanBelow = false;
          }
        }

        cx++;
      }
    }

    return static_cast<double>(filled);
  }

  std::shared_ptr<ArrayBuffer> getBuffer() override { return _buffer; }

private:
  std::shared_ptr<ArrayBuffer> _buffer = nullptr;
  size_t _width = 0;
  size_t _height = 0;
};

} // namespace margelo::nitro::chunkycrayon
