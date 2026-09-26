<?php

namespace App\Modules\Catalog\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Catalog\Models\Gym;
use App\Shared\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class GymController extends Controller
{
    public function __construct(protected ActivityLogService $activityLog) {}

    public function index(Request $request)
    {
        $perPage = max(1, min((int) $request->input('per_page', 15), 100));
        $search = trim((string) $request->input('search', ''));

        $query = Gym::query()->orderBy('sort_order')->orderByDesc('id');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sector', 'like', "%{$search}%")
                    ->orWhere('city', 'like', "%{$search}%");
            });
        }

        $paginator = $query->paginate($perPage);
        $paginator->getCollection()->transform(fn (Gym $g) => $this->format($g));

        return sendResponse($paginator, 'Gyms fetched');
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), $this->rules());

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $data = $validator->validated();
        $gym = Gym::create([
            ...$data,
            'status' => $data['status'] ?? 'active',
            'sort_order' => $data['sort_order'] ?? 0,
            'gallery' => $data['gallery'] ?? [],
            'opening_hours' => $data['opening_hours'] ?? [],
        ]);

        $this->activityLog->log('gym.created', 'catalog', "Gym {$gym->name} created", Gym::class, $gym->id, request: $request);

        return sendResponse($this->format($gym), 'Gym created');
    }

    public function show(int $id)
    {
        $gym = Gym::find($id);
        if (! $gym) {
            return sendError('Gym not found', [], 404);
        }

        return sendResponse($this->format($gym), 'Gym details');
    }

    public function update(Request $request, int $id)
    {
        $gym = Gym::find($id);
        if (! $gym) {
            return sendError('Gym not found', [], 404);
        }

        $validator = Validator::make($request->all(), $this->rules(update: true));

        if ($validator->fails()) {
            return sendError($validator->errors()->first(), $validator->errors()->toArray(), 422);
        }

        $gym->update($validator->validated());

        $this->activityLog->log('gym.updated', 'catalog', "Gym {$gym->name} updated", Gym::class, $gym->id, request: $request);

        return sendResponse($this->format($gym->fresh()), 'Gym updated');
    }

    public function destroy(Request $request, int $id)
    {
        $gym = Gym::find($id);
        if (! $gym) {
            return sendError('Gym not found', [], 404);
        }

        $name = $gym->name;
        $gym->delete();

        $this->activityLog->log('gym.deleted', 'catalog', "Gym {$name} deleted", request: $request);

        return sendResponse([], 'Gym deleted');
    }

    /** @return array<string, string> */
    protected function rules(bool $update = false): array
    {
        $required = $update ? 'sometimes' : 'required';

        return [
            'name' => "{$required}|string|max:255",
            'name_en' => 'nullable|string|max:255',
            'sector' => 'nullable|string|max:120',
            'city' => 'nullable|string|max:120',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'cover_image' => 'nullable|string|max:500',
            'gallery' => 'nullable|array',
            'gallery.*' => 'string|max:500',
            'description' => 'nullable|string',
            'subscription_info' => 'nullable|string',
            'opening_hours' => 'nullable|array',
            'status' => 'nullable|in:active,inactive',
            'sort_order' => 'nullable|integer|min:0',
        ];
    }

    protected function format(Gym $gym): array
    {
        return [
            'id' => $gym->id,
            'name' => $gym->name,
            'name_en' => $gym->name_en,
            'sector' => $gym->sector,
            'city' => $gym->city,
            'latitude' => $gym->latitude,
            'longitude' => $gym->longitude,
            'cover_image' => $gym->cover_image,
            'gallery' => $gym->gallery ?? [],
            'description' => $gym->description,
            'subscription_info' => $gym->subscription_info,
            'opening_hours' => $gym->opening_hours ?? [],
            'status' => $gym->status,
            'sort_order' => $gym->sort_order,
        ];
    }
}
