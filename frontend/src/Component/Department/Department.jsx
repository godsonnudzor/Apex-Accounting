import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getApiUrl } from "../../context/auth";

const Department = () => {
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  useEffect(() => {
    fetch(getApiUrl("/api/departments"), { credentials: "include" })
      .then(async (response) => {
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Unable to load departments");
        }

        return result.departments || [];
      })
      .then(setDepartments)
      .catch((loadError) => setError(loadError.message));
  }, []);

  const startEdit = (department) => {
    setEditingId(department.id);
    setEditName(department.name);
    setEditDescription(department.description || "");
  };

  const updateDepartment = async (id) => {
    try {
      const response = await fetch(getApiUrl(`/api/departments/${id}`), {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          description: editDescription,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to update department");
      }

      setDepartments((current) =>
        current.map((department) =>
          department.id === id
            ? {
                ...department,
                name: editName,
                description: editDescription,
              }
            : department,
        ),
      );

      setEditingId(null);
      setError("");
    } catch (updateError) {
      setError(updateError.message);
    }
  };

  const deleteDepartment = async (id) => {
    if (!window.confirm("Delete this department?")) return;

    try {
      const response = await fetch(getApiUrl(`/api/departments/${id}`), {
        method: "DELETE",
        credentials: "include",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to delete department");
      }

      setDepartments((current) =>
        current.filter((department) => department.id !== id),
      );
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  const filteredDepartments = departments.filter((department) =>
    department.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
  <div className="p-5">
    <div className="text-center">
      <h3 className="text-2xl font-bold">Manage Departments</h3>
    </div>

    <div className="flex items-center justify-between gap-4 p-4">
      <input
        type="text"
        placeholder="Search by department name"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="rounded border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <Link
        to="/department/add"
        className="rounded bg-teal-500 px-4 py-2 text-white hover:bg-teal-600"
      >
        Add New Department
      </Link>
    </div>

    {error && <p className="px-4 pb-3 text-red-600">{error}</p>}

    <div className="overflow-x-auto px-4">
      <table className="w-full border-collapse border border-gray-200">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="border border-gray-200 px-4 py-3">
              Department Name
            </th>
            <th className="border border-gray-200 px-4 py-3">
              Description
            </th>
            <th className="border border-gray-200 px-4 py-3 text-center">
              Actions
            </th>
          </tr>
        </thead>

        <tbody>
          {filteredDepartments.length ? (
            filteredDepartments.map((department) => (
              <tr key={department.id} className="hover:bg-gray-50">
                {editingId === department.id ? (
                  <>
                    <td className="border border-gray-200 px-4 py-3">
                      <input
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        className="w-full rounded border px-3 py-2"
                      />
                    </td>

                    <td className="border border-gray-200 px-4 py-3">
                      <textarea
                        value={editDescription}
                        onChange={(event) =>
                          setEditDescription(event.target.value)
                        }
                        className="w-full rounded border px-3 py-2"
                        rows="2"
                      />
                    </td>

                    <td className="border border-gray-200 px-4 py-3 text-center">
                      <button
                        onClick={() => updateDepartment(department.id)}
                        className="mr-2 rounded bg-blue-500 px-3 py-1 text-white hover:bg-blue-600"
                      >
                        Save
                      </button>

                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded bg-gray-500 px-3 py-1 text-white hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="border border-gray-200 px-4 py-3 font-semibold">
                      {department.name}
                    </td>

                    <td className="border border-gray-200 px-4 py-3 text-gray-600">
                      {department.description || "No description"}
                    </td>

                    <td className="border border-gray-200 px-4 py-3 text-center">
                      <button
                        onClick={() => startEdit(department)}
                        className="mr-2 rounded bg-yellow-500 px-3 py-1 text-white hover:bg-yellow-600"
                      >
                        Update
                      </button>

                      <button
                        onClick={() => deleteDepartment(department.id)}
                        className="rounded bg-red-500 px-3 py-1 text-white hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan="3"
                className="border border-gray-200 px-4 py-6 text-center text-gray-600"
              >
                No departments found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);
};

export default Department;